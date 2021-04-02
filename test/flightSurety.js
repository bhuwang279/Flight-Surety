var Test = require("../config/testConfig.js");
var BigNumber = require("bignumber.js");
const truffleAssert = require("truffle-assertions");

contract("Flight Surety Tests", async (accounts) => {
  var config;
  let flightName;
  let timestamp;

  before("setup contract", async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeContract(
      config.flightSuretyApp.address
    );
    flightName = config.flightName;
    timestamp = config.timestamp;
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(Data Contract) has correct initial isOperational() value`, async function () {
    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");
  });

  it(`(Data Contract) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {
    // Ensure that access is denied for non-Contract Owner account
    let accessDenied = false;
    try {
      await config.flightSuretyData.setOperatingStatus(false, {
        from: config.testAddresses[2],
      });
    } catch (e) {
      accessDenied = true;
    }
    assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
  });

  it(`(Data Contract) can allow access to setOperatingStatus() for Contract Owner account`, async function () {
    // Ensure that access is allowed for Contract Owner account
    let accessDenied = false;
    try {
      await config.flightSuretyData.setOperatingStatus(false);
    } catch (e) {
      accessDenied = true;
    }
    assert.equal(
      accessDenied,
      false,
      "Access not restricted to Contract Owner"
    );
  });

  it(`(Data Contract) can block access to functions using requireIsOperational when operating status is false`, async function () {
    await config.flightSuretyData.setOperatingStatus(false);

    let reverted = false;
    try {
      await config.flightSuretyData.isAirlineFunded(config.firstAirline);
    } catch (e) {
      reverted = true;
    }
    assert.equal(reverted, true, "Access not blocked for requireIsOperational");

    // Set it back for other tests to work
    await config.flightSuretyData.setOperatingStatus(true);
  });

  it(`(App Contract) has correct initial isOperational() value`, async function () {
    // Get operating status
    let status = await config.flightSuretyApp.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");
  });

  it(`(App Contract) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {
    // Ensure that access is denied for non-Contract Owner account
    let accessDenied = false;
    try {
      await config.flightSuretyApp.setOperatingStatus(false, {
        from: config.testAddresses[2],
      });
    } catch (e) {
      accessDenied = true;
    }
    assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
  });

  it(`(App Contract) can allow access to setOperatingStatus() for Contract Owner account`, async function () {
    // Ensure that access is allowed for Contract Owner account
    let accessDenied = false;
    try {
      await config.flightSuretyApp.setOperatingStatus(false);
    } catch (e) {
      console.log(e);
      accessDenied = true;
    }
    assert.equal(
      accessDenied,
      false,
      "Access not restricted to Contract Owner"
    );
  });

  it(`(App Contract) can block access to functions using requireIsOperational when operating status is false`, async function () {
    await config.flightSuretyApp.setOperatingStatus(false);

    let reverted = false;
    try {
      await config.flightSuretyApp.isAirlineFunded(config.firstAirline);
    } catch (e) {
      reverted = true;
    }
    assert.equal(reverted, true, "Access not blocked for requireIsOperational");

    // Set it back for other tests to work
    await config.flightSuretyApp.setOperatingStatus(true);
  });

  it("(airline) cannot register an Airline using registerAirline() if calling airline is not funded", async () => {
    // ARRANGE
    let newAirline = accounts[2];
    let reverted = false;

    // ACT
    try {
      await config.flightSuretyApp.registerAirline(newAirline, {
        from: config.firstAirline,
      });
    } catch (e) {
      reverted = true;
    }

    // ASSERT
    assert.equal(
      reverted,
      true,
      "Airline should not be able to register another airline if it hasn't provided funding"
    );
  });
  it("(airline) cannot vote an Airline using voteAirline() if it is not funded", async () => {
    // ARRANGE
    let airline2 = accounts[2];
    let reverted = false;
    // ACT
    try {
      await config.flightSuretyApp.voteAirline(airline2, {
        from: config.firstAirline,
      });
    } catch (e) {
      reverted = true;
    }
    assert.equal(
      reverted,
      true,
      "Airline should not be able to vote another airline if it hasn't provided funding"
    );
  });

  it("(airline) if ether greater than or equal to 10 is provided, airline should move to funded status", async () => {
    // ARRANGE

    const FundedState = 1;

    // ACT
    try {
      await config.flightSuretyApp.fund({
        from: config.firstAirline,
        value: web3.utils.toWei("10", "ether"),
      });
    } catch (e) {
      console.log(e);
    }
    const firstAirlineFunded = await config.flightSuretyApp.isAirlineFunded(
      config.firstAirline
    );
    assert.equal(
      firstAirlineFunded,
      true,
      "Airline should be in funded status"
    );
  });

  it("(multiparty) Any funded airline should be able to register new airline if no of registered airline is less than 4", async () => {
    // ARRANGE
    let airline2 = accounts[2];

    // ACT
    try {
      await config.flightSuretyApp.registerAirline(airline2, {
        from: config.firstAirline,
      });
    } catch (e) {
      console.log(e);
    }
    expect(await config.flightSuretyData.noOfAirlinesRegistered.call()).to.eql(
      web3.utils.toBN(2)
    );
  });

  it("(multiparty) 5th and subsequent airline registration will require 50% consensus if no of registered airline is greater than 4", async () => {
    // ARRANGE
    let newAirline3 = accounts[3];
    let newAirline4 = accounts[4];
    let newAirline5 = accounts[5];
    let reverted = false;
    // register 2 new airlines
    try {
      await config.flightSuretyApp.registerAirline(newAirline3, {
        from: config.firstAirline,
      });

      await config.flightSuretyApp.registerAirline(newAirline4, {
        from: config.firstAirline,
      });
    } catch (e) {
      console.log(e);
    }
    //2nd Ariline was registerd in previous test
    expect(await config.flightSuretyData.noOfAirlinesRegistered.call()).to.eql(
      web3.utils.toBN(4)
    );

    // Funded Airline Fails to register 5th one
    // Act

    try {
      await config.flightSuretyApp.registerAirline(newAirline5, {
        from: config.firstAirline,
      });
    } catch (e) {
      reverted = true;
    }
    //Assert

    assert.equal(
      reverted,
      true,
      "New airline registration should have 50% consensus"
    );
  });

  it("(multiparty) 5th and subsequent airline registration will should register if they get 50% consensus", async () => {
    // ARRANGE
    let airline2 = accounts[2];
    let airline6 = accounts[6];
    let reverted = false;
    // register 2 new airlines
    try {
      // Move airline 2 to funded state
      await config.flightSuretyApp.fund({
        from: airline2,
        value: web3.utils.toWei("10", "ether"),
      });

      const secondAirlineFunded = await config.flightSuretyApp.isAirlineFunded(
        airline2
      );
      assert.equal(
        secondAirlineFunded,
        true,
        "Second Airline should be in funded state"
      );

      //Vote airline6 by firstAirline, Since only two airline are in funded state therefore one vite is 50% consensus

      await config.flightSuretyApp.voteAirline(airline6, {
        from: config.firstAirline,
      });
    } catch (e) {
      console.log(e);
    }

    // Funded Airline successfully registers new airline
    // Act

    try {
      await config.flightSuretyApp.registerAirline(airline6, {
        from: config.firstAirline,
      });
    } catch (e) {
      console.log(e);
      reverted = true;
    }

    //Assert

    assert.equal(
      reverted,
      false,
      "New airline registration should have 50% consensus"
    );
  });

  it("(airline) Can register a flight", async () => {
    //Arrange
    let transaction;
    try {
      transaction = await config.flightSuretyApp.registerFlight(
        flightName,
        timestamp,
        {
          from: config.firstAirline,
        }
      );
    } catch (e) {
      console.log(e);
    }
    const flightKey = await config.flightSuretyData.getFlightKey(
      config.firstAirline,
      flightName,
      timestamp
    );
    const flight = await config.flightSuretyData.flights.call(flightKey);
    assert.equal(flight.isRegistered, true, "Error: flight was not registered");

    // truffleAssert.eventEmitted(transaction, "FlightRegistered");
  });
  it("(passenger) Can buy insurance", async () => {
    const passengerAccount = accounts[7];
    // Declare and Initialize a variable for event
    let eventEmitted = false;

    //@dev event.watch is not a function in web3.0 v1.0
    await config.flightSuretyData.contract.events.InsuranceBought(
      (error, event) => {
        eventEmitted = true;
      }
    );

    await config.flightSuretyApp.buy(
      config.firstAirline,
      flightName,
      timestamp,
      {
        from: passengerAccount,
        value: web3.utils.toWei("1", "ether"),
      }
    );

    assert.equal(eventEmitted, true, "Error: Was not able to buy insurance");
  });
});
