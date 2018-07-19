import React, { Component } from 'react';
import '../App.css';
import axios from 'axios';

class Home extends React.Component {
  constructor() {
    super();
  }

  render() {
    return (
      <div>
        <nav>
            <ul>
                <li><a href="/">Homepage</a></li>
            </ul>
        </nav>
        <header>
            <h1>Net Ninja OAuth Tut's</h1>
            <h2>Homepage</h2>
        </header>
        <main>
            <p>Probably the best OAuth tutorials on the planet :)</p>
        </main>
        </div>
    );
  }
}

export default Home;
