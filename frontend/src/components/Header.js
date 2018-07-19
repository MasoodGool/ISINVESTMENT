import React, { Component } from 'react';
import '../App.css';
import axios from 'axios';

class MyForm extends React.Component {
  constructor() {
    super();
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleChange = this.handleChange.bind(this);
  }

  handleChange = event => {
     console.log(event.target.value);
     this.text = event.target.value;
     this.setState({ [event.target.name]: this.text });
     console.log(this.state);
 }


  handleSubmit = event => {
    event.preventDefault();
    console.log(this.state);
    this.setState({ [event.target.name]: event.target.value });
    const {title,description,price, deadline} = this.state;

    axios.post(`http://localhost:3000/game`, { title,description, price, deadline})
      .then(res => {
      })
  }

  render() {
    return (
      <form onSubmit={this.handleSubmit}>
        <label htmlFor="title">Enter title</label>
        <input id="title" name="title" type="text"  onChange={this.handleChange}/>
        <label htmlFor="title">Enter description</label>
        <input id="descritpion" name="description" type="text"  onChange={this.handleChange}/>
        <label htmlFor="title">Enter Price</label>
        <input id="price" name="price" type="text"  onChange={this.handleChange}/>
        <button onChange={this.handleSubmit}>Send data!</button>
        <input id="deadline" name="deadline" type="date" onChange={this.handleChange}/>
      </form>
    );
  }
}

export default MyForm;
