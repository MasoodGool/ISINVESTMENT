import React, { Component } from 'react';
import '../App.css';
import axios from 'axios';

class RegisterForm extends React.Component {
  constructor() {
    super();
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleChange = this.handleChange.bind(this);
  }

  	state = {
    title: '',
    description:'bb',
  }

  handleChange = event => {
    this.setState({title: event.target.value });
    console.log( this.state);
  }


  handleSubmit = event => {
    event.preventDefault();
  }


  render() {
    return (
      <div>
      <h1>Welcome</h1>
		<h3>Register</h3>
		
		<div class="login-form">
			<form action="/" method="post">
				<input type="text" name="email" placeholder="E-mail" required=""/>
				<br/>
				<input type="text" name="username" placeholder="Username" required=""/>
				<br/>
				<input type="password" name="password" placeholder="Password" required=""/>
				<br/>
				<input type="password" name="passwordConf" placeholder="Confirm Password" required=""/>
				<br/>
				<input type="submit" value="REGISTER"/>
			</form>
      </div>
     </div>
    );
  }
}

export default RegisterForm;
