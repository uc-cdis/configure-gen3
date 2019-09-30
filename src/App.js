import React from 'react';
import Select from 'react-select';
import jsyaml from 'js-yaml';
import open from './img/open.svg';
import { commonsConfig } from './commonsManifest';
import './App.css';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedCommons: null,
      root: null,
      descendants: [],
      dictionary: null,
      hiddenNodes: [],
    }
  }

  selectCommons = e => {
    this.setState({ selectedCommons: e.value },
      () => { this.fetchCommonsInfo(commonsConfig[e.value]) }
    );
  }

  selectRoot = e => {
    this.setState({ root: e.value }, () => this.getDescendants(e.value));
  }

  selectDescendant = (e, i) => {
    let newList = this.state.descendants;
    newList[i] = { ...this.state.descendants[i], name: e.value };
    this.setState({ descendants: newList}, () => this.getProps(e.value));
  }

  selectSortBy = (e, i) => {
    let newDescendants = this.state.descendants;
    newDescendants[i].sortBy = e;
    this.setState({ descendant: newDescendants });
  }

  parseMapping = file => {
    const oldFile = file;
    file = file.mappings[0];
    console.log('file', oldFile)
    const { root, flatten_props } = file;
    if (root) {
      const parent = ({ value: root, label: this.state.dictionary[root].title })
      this.selectRoot(parent);
    }
    let descendants = [];
    flatten_props.forEach((node) => {
      Object.keys(this.state.dictionary).forEach((key) => {
        if (this.state.dictionary[key].links && this.state.dictionary[key].links.some((link) => link.backref === node.path )) {
          let sortedBy = !!node.sorted_by ? node.sorted_by.split(",") : null;
          let attributes = node.props.map((prop) => ({ value: prop.name, label: prop.name }));
          descendants.push({ name: key, sortBy: sortedBy ? sortedBy.map((sort) => ({ value: sort, label: sort })) : null, props: attributes });
        }
      })
    });
    this.setState({ descendants });
  }

  fetchCommonsInfo = commons => {
    fetch(commons.dictionary)
      .then(res => res.json())
      .then(data => {
        this.setState({ dictionary: data })
      })
      .then(() =>
        fetch(commons.mapping)
          .then(res => res.text())
          .then(data => this.parseMapping(jsyaml.load(data)))
        )
  }

  getDescendants = root => {
    const allNodes = Object.keys(this.state.dictionary).filter((key) => this.state.dictionary[key].$schema);
    return allNodes.filter((key) => this.state.dictionary[key].links &&
      this.state.dictionary[key].links.some(item => item.target_type === root));
  }

  getProps = descendant => {
    return this.state.dictionary[descendant].properties;
  }

  isMulti = descendant => {
    return this.state.dictionary[descendant].links.find((link) => link.target_type === this.state.root) !== "one_to_one";
  }

  addDescendant = () => {
    let newList = this.state.descendants;
    newList.push({ sortBy: null, props: null });
    let hiddenNodes = this.state.hiddenNodes;
    hiddenNodes.push(false);
    this.setState({ descendants: newList, hiddenNodes });
  }

  toggleNode = i => {
    if (this.state.descendants[i]) {
      let newList = this.state.hiddenNodes;
      newList[i] = !newList[i];
      this.setState({ hiddenNodes: newList });
    }
  }

  toggleAttribute = (e, i) => {
    let newList = this.state.descendants;
    newList[i].props = e;
    this.setState({ descendants: newList });
  }

  deleteNode = i => {
    let newList = this.state.descendants;
    newList.splice(i, 1);
    this.setState({ descendant: newList });
  }

  submitMapping = () => {
    const mapping = {
      mapping: {
        name: "dcp_etl",
        doc_type: "case",
        type: "aggregator",
        root: this.state.root,
        props: [],
        flatten_props: this.state.descendants.map((node) =>
          ({
            path: this.state.dictionary[node.name].links[0].backref,
            sorted_by: node.sortBy ? node.sortBy.join(',') : null,
            props: node.props.map((prop) => ({ name: prop.value }))
          })
        )
      }
    }
    console.log('mapping', mapping)
  }

  render() {
    const options = commonsConfig.map((commons, i) =>
      ({ value: i, label: commons.name }));
    return (
      <div className="app">
        <h1>Configure a Gen3 Commons</h1>
        <button onClick={() => this.submitMapping()}>Submit Mapping</button>
        <h2>Select your commons</h2>
        <Select
          value={this.state.selectCommons}
          options={options}
          onChange={(e) => this.selectCommons(e)}
        />
        {
          this.state.dictionary ?
            <React.Fragment>
              <h2>Select the root node (usually Case or Subject)</h2>
              <Select
                value={{ value: this.state.root, label: this.state.root}}
                options={Object.keys(this.state.dictionary)
                  .filter((node) => this.state.dictionary[node].$schema)
                  .map((node) => ({ value: node, label: this.state.dictionary[node].title }))
                }
                onChange={(e) => this.selectRoot(e)}
              />
            </React.Fragment>
          : null
        }
        {
          this.state.root ?
            <button onClick={() => this.addDescendant()}>Add a New Node</button>
          : null
        }
        <div className='descendants'>
        {
          this.state.descendants.map((descendant, i) =>
            <div key={i} className='descendant'>
              <div className='descendant__closed'>
                <h2>{ descendant.name ? descendant.name : 'Select the node you want to configure' }</h2>
                <img src={open} alt='toggle node' onClick={() => this.toggleNode(i)} />
                <button onClick={() => this.deleteNode(i)}>Delete node</button>
              </div>
              {
                !this.state.hiddenNodes[i] ?
                <div>
                  <React.Fragment>
                    <Select
                      value={{ value: descendant.name, label: descendant.name }}
                      options={this.getDescendants(this.state.root).map((desc) => ({ value: desc, label: this.state.dictionary[desc].title }))}
                      onChange={(e) => this.selectDescendant(e, i)}
                    />
                  </React.Fragment>
                  {
                     this.state.descendants[i].name && this.isMulti(this.state.descendants[i].name) ?
                        <React.Fragment>
                          <h2>The Explorer will grab the top node, sorted by... (usually updated_datetime):</h2>
                          <Select
                            value={this.state.descendants[i].sortBy}
                            options={Object.keys(this.getProps(this.state.descendants[i].name)).map((key) => ({ value: key, label: key}))}
                            onChange={(e) => this.selectSortBy(e, i)}
                            isMulti
                          />
                        </React.Fragment>
                      : null
                  }
                  {
                    this.state.descendants[i].name ?
                      <React.Fragment>
                        <h2>Which properties do you want to add?</h2>
                        <Select
                          value={this.state.descendants[i].props}
                          options={Object.keys(this.getProps(this.state.descendants[i].name)).map((prop) => ({ value: prop, label: prop }) )}
                          onChange={(e) => this.toggleAttribute(e, i)}
                          isMulti
                        />
                      </React.Fragment>
                    : null
                  }
                </div>
                : null
              }
          </div>
          )}
        </div>
      </div>
    );
  }
}

export default App;
