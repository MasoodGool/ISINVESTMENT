import React, { Component } from 'react';
import '../App.css';
import axios from 'axios';
import moment from 'moment';

const API = 'http://127.0.0.1:3000/game';

  class Table extends Component {
  constructor(props) {
    super(props);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.state = {
      games: [],
    };
  }

  componentDidMount() {
    fetch(API)
      .then(response => response.json())
      .then(data => this.setState({ games: data }));
  }

  handleSubmit = event => {
    event.preventDefault();
    console.log('Sorting the table');
    fetch('http://localhost:3000/game/sorted')
      .then(response => response.json())
      .then(data => this.setState({ games: data }));
  }


  render() {
    const { games } = this.state;
    return (
      <div>
      <button onClick={this.handleSubmit}>Sort</button>
        {games.map(hit =>
          <div key={hit._id}>
            <h1><a href={hit.title}>{hit.title}is R{hit.price}</a></h1>
            <h3>{hit.description}</h3>
            <h4 style={{color:'red'}}>{hit.deadline}</h4>
          </div>
        )}
      </div>
    );
  }
}

export default Table;