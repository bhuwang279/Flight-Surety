import FlightSuretyApp from "../../build/contracts/FlightSuretyApp.json";
import FlightSuretyData from "../../build/contracts/FlightSuretyData.json";
import Config from "./config.json";
import Web3 from "web3";

export default class Contract {
  constructor(network, callback) {
    let config = Config[network];
    // Inject web3
    if (window.ethereum) {
      // use metamask's providers
      // modern browsers
      this.web3 = new Web3(window.ethereum);
      // Request accounts access
      try {
        window.ethereum.enable();
      } catch (error) {
        console.error("User denied access to accounts");
      }
    } else if (window.web3) {
      // legacy browsers
      this.web3 = new Web3(web3.currentProvider);
    } else {
      // fallback for non dapp browsers
      this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
    }

    // Load contract
    this.flightSuretyApp = new this.web3.eth.Contract(
      FlightSuretyApp.abi,
      config.appAddress
    );
    this.flightSuretyData = new this.web3.eth.Contract(
      FlightSuretyData.abi,
      config.appAddress
    );
    this.initialize(callback);
    this.account = null;
  }

  initialize(callback) {
    this.web3.eth.getAccounts((error, accts) => {
      if (!error) {
        this.account = accts[0];
        callback();
      } else {
        console.error(error);
      }
    });
  }

  isOperational(callback) {
    let self = this;
    self.flightSuretyApp.methods
      .isOperational()
      .call({ from: self.owner }, callback);
  }

  fetchFlightStatus({ airline, flightName, timestamp }, callback) {
    let self = this;
    let payload = {
      airline: airline,
      flight: flightName,
      timestamp: timestamp,
    };
    self.flightSuretyApp.methods
      .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
      .send({ from: self.account }, (error, result) => {
        callback(error, result);
      });
  }
  fundAirline(amount, callback) {
    let self = this;
    self.flightSuretyApp.methods.fund().send(
      {
        from: self.account,
        value: this.web3.utils.toWei(amount.toString(), "ether"),
      },
      (error, result) => {
        callback(error, result);
      }
    );
  }
  registerAirline(airline, callback) {
    let self = this;
    self.flightSuretyApp.methods
      .registerAirline(airline)
      .send({ from: self.account }, (error, result) => {
        callback(error, result);
      });
  }

  voteAirline(airline, callback) {
    let self = this;
    self.flightSuretyApp.methods
      .voteAirline(airline)
      .send({ from: self.account }, (error, result) => {
        callback(error, result);
      });
  }
  registerFlight(flight, callback) {
    let self = this;
    let timestamp = Math.floor(new Date().getTime() / 1000);
    self.flightSuretyApp.methods
      .registerFlight(flight, timestamp)
      .send({ from: self.account }, (error, result) => {
        callback(error, result);
      });
  }

  buyInsurance({ airline, flightName, timestamp }, amount, callback) {
    let self = this;
    self.flightSuretyApp.methods.buy(airline, flightName, timestamp).send(
      {
        from: self.account,
        value: this.web3.utils.toWei(amount.toString(), "ether"),
      },
      (error, result) => {
        callback(error, result);
      }
    );
  }
  withdraw(callback) {
    let self = this;
    self.flightSuretyApp.methods.withdraw().send(
      {
        from: self.account,
      },
      (error, result) => {
        callback(error, result);
      }
    );
  }
}
