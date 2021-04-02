import FlightSuretyApp from "../../build/contracts/FlightSuretyApp.json";
import FlightSuretyData from "../../build/contracts/FlightSuretyData.json";
import Config from "./config.json";
import Web3 from "web3";
import express from "express";
var cors = require("cors");

let config = Config["localhost"];
let web3 = new Web3(
  new Web3.providers.WebsocketProvider(config.url.replace("http", "ws"))
);
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(
  FlightSuretyApp.abi,
  config.appAddress
);
let flightSuretyData = new web3.eth.Contract(
  FlightSuretyData.abi,
  config.dataAddress
);
const oracles = [];
const flights = [];

const NUMBER_OF_ORACLES = 25;
const registerOracles = async () => {
  let accounts = await web3.eth.getAccounts();
  try {
    await flightSuretyData.methods
      .authorizeContract(config.appAddress)
      .send({ from: accounts[0] });
  } catch (e) {
    console.log(e);
  }

  let fee = await flightSuretyApp.methods.REGISTRATION_FEE().call();
  console.log("Registering Oracles 😇😇😇😇😇😇😇😇😇😇😇😇😇😇😇😇😇😇😇");

  accounts
    .slice(10, NUMBER_OF_ORACLES + 10)
    .forEach(async (oracleAddress, index) => {
      try {
        await flightSuretyApp.methods
          .registerOracle()
          .send({ from: oracleAddress, value: fee, gas: 3000000 });
        let indexes = await flightSuretyApp.methods
          .getMyIndexes()
          .call({ from: oracleAddress });
        oracles.push({
          address: oracleAddress,
          indexes,
        });
        console.log(
          `${index} => Address: ${oracleAddress}, indexes : ${indexes}`
        );
      } catch (e) {
        console.log(e);
      }
    });
};
registerOracles();

const getFlightAndSave = async () => {
  try {
    const flightCount = await flightSuretyApp.methods.getFlightCount().call();
    console.log("flightCount  ", flightCount);
    if (flightCount > 0) {
      for (let i = 0; i <= flightCount - 1; i++) {
        const flight = await flightSuretyApp.methods.getFlightDetails(i).call();
        const {
          airline,
          flightName,
          timestamp,
          flightKey,
          statusCode,
        } = flight;
        flights.push({
          airline,
          flightName: flightName,
          timestamp: timestamp,
          key: flightKey,
          statusCode: statusCode,
        });
        console.log(flight);
      }
    }
  } catch (e) {
    console.log(e);
  }
};
getFlightAndSave();

flightSuretyApp.events.AirlineVoted(function (error, event) {
  if (error) {
    console.log("AirlineVoted Event Error => ", error);
  } else {
    console.log(" AirlineVoted Event Result => ", event);
  }
});

flightSuretyApp.events.FlightStatusInfo(function (error, event) {
  if (error) {
    console.log("FlightStatusInfo Event Error => ", error);
  } else {
    console.log(" FlightStatusInfo Event Result => ", event);
  }
});

flightSuretyApp.events.OracleReport(function (error, event) {
  if (error) {
    console.log("OracleReport Event Error => ", error);
  } else {
    console.log(" OracleReport Event Result => ", event);
  }
});

flightSuretyApp.events.checkResponseLength(function (error, event) {
  if (error) {
    console.log("checkResponseLength Event Error => ", error);
  } else {
    console.log(" checkResponseLength Event Result => ", event);
  }
});

flightSuretyApp.events.OracleRequest(
  {
    fromBlock: 0,
  },
  function (error, event) {
    if (error) {
      console.log("OracleRequest Event Error => ", error);
    } else {
      console.log("OracleRequest Event Result => ", event);
      const {
        returnValues: { index, flight, airline, timestamp },
      } = event;
      console.log(
        `Oracle Request Event: index => ${index} ,  airline => ${airline} ,  timestamp  => ${timestamp}`
      );
      let randomStatusCode = (Math.floor(Math.random() * 5) + 1) * 10;

      oracles.forEach(async (oracle) => {
        for (let i = 0; i < 3; i++) {
          try {
            const transaction = await flightSuretyApp.methods
              .submitOracleResponse(
                oracle.indexes[i],
                airline,
                flight,
                timestamp,
                randomStatusCode
              )
              .send({ from: oracle.address });
            console.log(
              `=> 🍺 🍺 🍺 🎉!🎉!🎉! Accepted with status code ${randomStatusCode}  from oracles(${oracle.address}) at index(${index}) `
            );
          } catch (e) {
            if (e.data[Object.keys(e.data)[0]].reason) {
              console.log(e.data[Object.keys(e.data)[0]].reason);
            }

            console.log(
              `=> 💔 💔 💔 😭 😭 😭 Rejected with status code ${randomStatusCode}  from oracles(${oracle.address}) at index(${index})`
            );
          }
        }
        // oracle.indexes.forEach((index) => {
        //   flightSuretyApp.methods
        //     .submitOracleResponse(
        //       index,
        //       airline,
        //       flight,
        //       timestamp,
        //       randomStatusCode
        //     )
        //     .send({ from: oracle.address })
        //     .then((res) => {
        //       console.log(
        //         `=> Accepted with status code ${randomStatusCode}  from oracles(${oracle.address}) at index(${index}) `
        //       );
        //     })
        //     .catch((err) => {
        //       console.log(
        //         `=> Rejected with status code ${randomStatusCode}  from oracles(${oracle.address}) at index(${index})`
        //       );
        //     });
        // });
      });
    }
  }
);
flightSuretyData.events.NewAirlineRegistered(function (error, event) {
  if (error) {
    console.log("NewAirlineRegistered Event Error => ", error);
  } else {
    console.log(" NewAirlineRegistered Event Result => ", event);
  }
});

flightSuretyData.events.AirlineFunded(function (error, event) {
  if (error) {
    console.log("AirlineFunded Event Error => ", error);
  } else {
    console.log(" AirlineFunded Event Result => ", event);
  }
});

flightSuretyData.events.InsuranceBought(function (error, event) {
  if (error) {
    console.log("InsuranceBought Event Error => ", error);
  } else {
    console.log(" InsuranceBought Event Result => ", event);
  }
});

flightSuretyData.events.PaidPassenger(function (error, event) {
  if (error) {
    console.log("PaidPassenger Event Error => ", error);
  } else {
    console.log(" PaidPassenger Event Result => ", event);
  }
});

flightSuretyData.events.InsuranceCredited(function (error, event) {
  if (error) {
    console.log("InsuranceCredited Event Error => ", error);
  } else {
    console.log(" InsuranceCredited Event Result => ", event);
  }
});

flightSuretyData.events.FlightRegistered(function (error, event) {
  if (error) {
    console.log("FlightRegistered Event Error =>", error);
  } else {
    const {
      returnValues: { airline, flight, timestamp, flightKey, statusCode },
    } = event;
    console.log(" FlightRegistered Event Result => ", event);

    flights.push({
      airline,
      flightName: flight,
      timestamp: timestamp,
      key: flightKey,
      statusCode: statusCode,
    });
  }
});

const app = express();
app.use(cors());
app.get("/api", (req, res) => {
  res.send({
    message: "An API for use with your Dapp!",
  });
});

app.get("/flights", (req, res) => {
  res.json(flights);
});

export default app;
