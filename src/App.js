import React from 'react';
import Select from 'react-select';
import { commonsConfig } from './commonsManifest';
import './App.css';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedCommons: null,
      parent: null,
      descendants: null,
      dictionary: null,
    }
  }

  selectCommons = e => {
    this.setState({ selectedCommons: e.value }, () => this.fetchDictionary(commonsConfig[e.value].dictionary));
  }

  selectParent = e => {
    this.setState({ parent: e.value }, () => this.getDescendants(e.value));
  }

  selectDescendant = e => {
    this.setState({ descendant: e.value }, () => this.getAttributes(e.value));
  }

  fetchDictionary = url => {
    fetch(url)
      .then(res => res.json())
      .then(data => this.setState({ dictionary: data }));
  }

  getDescendants = parent => {
    const allNodes = Object.keys(this.state.dictionary).filter((key) => this.state.dictionary[key].$schema);
    const desc = allNodes.filter((key) => this.state.dictionary[key].links &&
      this.state.dictionary[key].links.some(item => item.target_type === parent));
    return desc;
  }

  getAttributes = descendant => {
    const attrs = this.state.dictionary[descendant].properties;
    console.log('attrs', attrs);
    return attrs;
  }

  isMulti = descendant => this.state.dictionary[descendant].links.find((link) => link.target_type === this.state.parent) !== "one_to_one";

  render() {
    const options = commonsConfig.map((commons, i) =>
      ({ value: i, label: commons.name }));
    const selectedCommons = this.state.selectedCommons !== null ? commonsConfig[this.state.selectedCommons] : null;
    return (
      <div className="app">
        <h1>Configure a Gen3 Commons</h1>
        <h2>Select your commons</h2>
        <Select
          options={options}
          onChange={(e) => this.selectCommons(e)}
        />
        {
          this.state.dictionary ?
            <React.Fragment>
              <h2>Select the parent node (usually Case or Subject)</h2>
              <Select
                options={Object.keys(this.state.dictionary).map((node) => ({ value: node, label: this.state.dictionary[node].title }))}
                onChange={(e) => this.selectParent(e)}
              />
            </React.Fragment>
          : null
        }
        {
          this.state.parent ?
            <React.Fragment>
              <h2>Select the node you want to configure</h2>
              <Select
                options={this.getDescendants(this.state.parent).map((desc) => ({ value: desc, label: this.state.dictionary[desc].title }))}
                onChange={(e) => this.selectDescendant(e)}
              />
            </React.Fragment>
          : null
        }
        {
           this.state.descendant && this.isMulti(this.state.descendant) ?
            <React.Fragment>
              <h2>The Explorer will grab the top node, sorted by... (usually updated_datetime):</h2>
              <Select options={Object.keys(this.getAttributes(this.state.descendant)).map((key) => ({ value: key, label: key }))} />
            </React.Fragment>
          : null
        }
        {
          this.state.descendant ?
            <React.Fragment>
              <h2>Which properties do you want to add?</h2>
              {
                Object.keys(this.getAttributes(this.state.descendant)).map((prop) =>
                  <div>
                    <input type='checkbox' /><label>{ prop }</label>
                  </div>
                )
              }
            </React.Fragment>
          : null
        }
      </div>
    );
  }
}

export default App;
