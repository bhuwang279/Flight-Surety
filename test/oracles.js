var Test = require("../config/testConfig.js");
//var BigNumber = require('bignumber.js');
const truffleAssert = require("truffle-assertions");

contract("Oracles", async (accounts) => {
  const NUMBER_OF_ORACLES = 20;
  var config;
  const flightName = "DRK";
  const timestamp = Math.floor(new Date().getTime() / 1000);
  let passengerAccount;
  before("setup contract", async () => {
    config = await Test.Config(accounts);
    passengerAccount = accounts[7];

    // authorize app contract
    await config.flightSuretyData.authorizeContract(
      config.flightSuretyApp.address
    );
    // provide funding
    await config.flightSuretyApp.fund({
      from: config.firstAirline,
      value: web3.utils.toWei("10", "ether"),
    });
    // register flight
    await config.flightSuretyApp.registerFlight(flightName, timestamp, {
      from: config.firstAirline,
    });

    // buy insurance
    await config.flightSuretyApp.buy(
      config.firstAirline,
      flightName,
      timestamp,
      {
        from: passengerAccount,
        value: web3.utils.toWei("1", "ether"),
      }
    );
  });
  // Watch contract events
  const STATUS_CODE_UNKNOWN = 0;
  const STATUS_CODE_ON_TIME = 10;
  const STATUS_CODE_LATE_AIRLINE = 20;
  const STATUS_CODE_LATE_WEATHER = 30;
  const STATUS_CODE_LATE_TECHNICAL = 40;
  const STATUS_CODE_LATE_OTHER = 50;

  it("can register oracles", async () => {
    // ARRANGE
    let fee = await config.flightSuretyApp.REGISTRATION_FEE.call();

    // ACT
    for (let a = 1; a < NUMBER_OF_ORACLES; a++) {
      const transaction = await config.flightSuretyApp.registerOracle({
        from: accounts[a],
        value: fee,
      });
      let result = await config.flightSuretyApp.getMyIndexes.call({
        from: accounts[a],
      });
      truffleAssert.eventEmitted(transaction, "OracleRegistered", (ev) => {
        console.log(
          `Oracle registered ${+ev.indexes[0]} ${+ev.indexes[1]} ${+ev
            .indexes[2]}`
        );
        return (
          (+ev.indexes[0] === +result[0]) &
          (+ev.indexes[1] === +result[1]) &
          (+ev.indexes[2] === +result[2])
        );
      });
    }
  });

  it("can request flight status", async () => {
    // ARRANGE

    // Declare and Initialize a variable for event
    let oracleRequestEventEmitted = false;

    // Watch the emitted event Harvested()
    //@dev event.watch is not a function in web3.0 v1.0
    await config.flightSuretyApp.contract.events.OracleRequest(
      (error, event) => {
        oracleRequestEventEmitted = true;
      }
    );

    // Submit a request for oracles to get status information for a flight
    const transaction = await config.flightSuretyApp.fetchFlightStatus(
      config.firstAirline,
      flightName,
      timestamp
    );
    assert.equal(
      oracleRequestEventEmitted,
      true,
      "Error: OracleRequest event not emitted"
    );
    // ACT
    for (let a = 1; a < NUMBER_OF_ORACLES; a++) {
      let oracleIndexes = await config.flightSuretyApp.getMyIndexes.call({
        from: accounts[a],
      });
      for (let i = 0; i < 3; i++) {
        try {
          let oracleReportEventEmitted = false;

          //@dev event.watch is not a function in web3.0 v1.0
          await config.flightSuretyApp.contract.events.OracleReport(
            (error, event) => {
              oracleReportEventEmitted = true;
            }
          );
          const transaction = await config.flightSuretyApp.submitOracleResponse(
            oracleIndexes[i],
            config.firstAirline,
            flightName,
            timestamp,
            STATUS_CODE_LATE_AIRLINE,
            { from: accounts[a] }
          );
          // Check OracleReport event, emitted if index match
          assert.equal(
            oracleReportEventEmitted,
            true,
            "Error: OracleReport event not emitted"
          );

          truffleAssert.eventEmitted(tx, "FlightProcessed");
        } catch (e) {
          //console.log(e);
        }
      }
    }
  });

  it("(passenger) Can withdraw credited insurance amount", async () => {
    // Declare and Initialize a variable for event
    let eventEmitted = false;

    //@dev event.watch is not a function in web3.0 v1.0
    await config.flightSuretyData.contract.events.PaidPassenger(
      (error, event) => {
        eventEmitted = true;
      }
    );

    const transaction = await config.flightSuretyApp.withdraw({
      from: passengerAccount,
    });
    assert.equal(eventEmitted, true, "Error: Passenger was not paid");
  });
});
