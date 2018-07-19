import React, { Component } from 'react';
import '../App.css';
import axios from 'axios';

class SearchForm extends React.Component {
  constructor() {
    super();
    this.handleFind = this.handleFind.bind(this);
    this.searchChange = this.searchChange.bind(this);
  }

  	state ={
    _id:'',
    title: '',
    description:'bb',
  }

/*  componentDidMount() {
  	axios.get('http://localhost:8080/game/')
  		.then(res => {
  			const games = res.data;
  			this.setState({games});
        console.log('onmount state');
        console.log(this.state);
  		})	
  }
*/

  searchChange = event => {
    this.setState({_id: event.target.value });
    console.log('search state');
    console.log( this.state._id);
/*              onChange = (e) => {
            // Because we named the inputs to match their corresponding values in state, it's
            // super easy to update the state
            this.setState({ [e.target.name]: e.target.value });
          }*/
  }


  handleFind = event => {
    event.preventDefault();

    const {_id,title,description} = this.state;
    var url = 'http://localhost:8080/game/' + _id;
    axios.get(url)
      .then(res => {
        const games = res.data.title;
        console.log('This is the games');
        this.setState({games});
        console.log(this.state);
      })
  }

  handleDelete = event => {
   event.preventDefault();

    const {_id,title,description} = this.state;
    var url = 'http://localhost:8080/game/' + _id;
    axios.delete(url)
      .then(res => {
        console.log('DELETE DELETE DELETE');
        this.setState();
  })
}

  render() {
    return (
    <div>
      <form onSubmit={this.handleFind}>
        <label htmlFor="title">Enter title</label>
        <input id="search" name="search" type="text"  onChange={this.searchChange}/>
        <button>Search data!</button>
      </form>
      <h1 id="display">Is this what you were looking for?</h1>
      <h3 id="display">{this.state.games}</h3>
      <form onSubmit={this.handleDelete}>
        <button>DELETE DELETE DELETE DELETE DELETE</button>
      </form>
    </div>
    );
  }
}

export default SearchForm;
