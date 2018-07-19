import React, { Component } from 'react';
import '../App.css';
import axios from 'axios';

  const numbers = [1,2,3,4,5];
  const listItems = numbers.map((number) => 
    <li>{number}</li>
    );

class DeleteForm extends React.Component {
  constructor() {
    super();
  	this.state = {};
  }

  render() {
    return (
    <div>
      <h1 id="display">DELETE DELETE DELETE DELETE DELETE</h1>
    	<ul>{listItems}</ul>
    </div>
    );
  }
}

export default DeleteForm;
