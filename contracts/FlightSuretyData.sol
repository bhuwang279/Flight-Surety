pragma solidity ^0.5.0;

import "../node_modules/@openzeppelin/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
    mapping(address => uint256) private authorizedContracts;            // Addresses that are authorized to call the contract functions
    uint256 private contractAirlineDeposits = 0 ether;                  // Total Deposits made by airlines. Doesn't hurt to keep the record

    enum AirlineState {
        Registered, // 0
        Funded // 1                                                   //Airline has enough funds and approved by existing airlines
    }

    AirlineState constant defaultAirlineState = AirlineState.Registered;
    struct Airline {
        uint256 funds;
        bool exists;
        AirlineState airlineState;
    }
    struct Flight {
        bool isRegistered;
        string flightName;
        uint256 registerdTimestamp;
        uint8 statusCode;
        uint256 updatedTimestamp;
        address airline;
        mapping(address => uint) insurances;
    }

      // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;
    
    uint256 public noOfAirlinesRegistered = 0;
    uint256 public noOfAirlinesFunded = 0;
    mapping(address => Airline) public airlines;
    mapping(bytes32 => Flight) public flights;
    bytes32[] internal flightKeys;

    /*------------Passenger -------------*/

    address[] internal passengers;
    mapping(address => uint) public passengerInsuranceCredits;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/
    event NewAirlineRegistered(address newAirline, address registeredBy);
    event AirlineFunded(address airline);
    event FlightRegistered(address airline, string flight, uint timestamp, bytes32 flightKey,  uint8 statusCode);
    event InsuranceBought(string flight,address passenger, uint amount);
    event InsuranceCredited(string flight,address passenger, uint amount);
    event PaidPassenger(address passengerAddress, uint amount);

    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
                                (
                                    address _initAirlineAddress
                                ) 
                                public 
                                payable
    {
        contractOwner = msg.sender;
        airlines[_initAirlineAddress].airlineState = AirlineState.Registered;
         airlines[_initAirlineAddress].exists = true;
        noOfAirlinesRegistered++;
    }


    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

     /**
    * @dev Modifier that requires atleast 10 ether to be sent to approve registration
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

     modifier requireIsCallerAuthorized()
    {
        require(authorizedContracts[msg.sender] == 1, "Caller is not authorized to call the function");
        _;
    }
    modifier requireAirlineNotRegistered(address newAirline) {
        require(
            !isAirlineRegistered(newAirline),
            "Airline should  not exist"
        );
        _;
    }
      modifier requireAirlineRegistered(address airlineAddress) {
        require(
            isAirlineRegistered(airlineAddress),
            "Airline must be registered to perform this action"
        );
        _;
    }

      modifier requireAirlineFunded(address registeredByAirlineAddress) {
        require( isAirlineFunded(registeredByAirlineAddress),"Airline must be funded to perform this action"
        );
        _;
    }

     modifier requireFlightRegistered(bytes32 flightKey) {
        require(flights[flightKey].isRegistered, "Flight is not registered");
        _;
    }

     modifier requireFlightNotRegistered(bytes32 flightKey) {
        require(!flights[flightKey].isRegistered, "Flight is not registered");
        _;
    }

    modifier requireFlightNotProcessed(bytes32 flightKey) {
        require(flights[flightKey].statusCode == 0, "This flight has been processed already");
        _;
    }

    modifier requirePassengerHasCredits(address passengerAddress){
        require(passengerInsuranceCredits[passengerAddress] > 0, "Passenger is not eligible for payout");
        _;
    } 

   
   

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus
                            (
                                bool mode
                            ) 
                            external
                            requireContractOwner 
    {
        operational = mode;
    }

    /**
    * @dev Authorize contract to call the functions of this contract
    *
    */ 
   function authorizeContract
                            (
                                address contractAddress
                            )
                            external
                            requireContractOwner
    {
        authorizedContracts[contractAddress] = 1;
    }

    /**
    * @dev Deauthorize contract to call the functions of this contract
    *
    */ 

    function deauthorizeContract
                            (
                                address contractAddress
                            )
                            external
                            requireContractOwner
    {
        delete authorizedContracts[contractAddress];
    }

     /**
    * @dev Check if Airline is funded
    *
    * @return A bool that is the Airline Funded
    */      
    function isAirlineFunded(address airlineAddress) 
                            public 
                            view 
                            requireIsOperational
                            requireIsCallerAuthorized
                            returns(bool) 
    {
        return airlines[airlineAddress].airlineState == AirlineState.Funded;
    }

     /**
    * @dev Check if Airline is registered
    *
    * @return A bool that is the Airline REgistered
    */      
    function isAirlineRegistered(address airlineAddress) 
                            public 
                            view 
                            requireIsOperational
                            requireIsCallerAuthorized
                            
                            returns(bool) 
    {
        return airlines[airlineAddress].exists;
    }

      /**
    * @dev Check if Airline is registered
    *
    * @return A bool that is the Airline REgistered
    */      
    function isFlightRegistered(address airlineAddress,string memory flight,uint256 timestamp) 
                            public 
                            view 
                            requireIsOperational
                            requireIsCallerAuthorized
                            
                            returns(bool) 
    {
        bytes32 key = getFlightKey(airlineAddress, flight, timestamp);

        return flights[key].isRegistered;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline
                            (  
                                address _newAirlineAddress,
                                address _registeredByAddress
                            )
                            external
                            requireIsOperational
                            requireIsCallerAuthorized
                            requireAirlineFunded(_registeredByAddress)
                            requireAirlineNotRegistered(_newAirlineAddress)
                            
    {
        airlines[_newAirlineAddress].airlineState = AirlineState.Registered;
        airlines[_newAirlineAddress].exists = true;
        noOfAirlinesRegistered++;
        emit NewAirlineRegistered(_newAirlineAddress, _registeredByAddress);

    }

     /**
     * @dev Register a future flight for insuring.
     *
     */

    function registerFlight( address airlineAddress ,string calldata  flight,uint256 timestamp)
     external 
     requireIsOperational
     requireIsCallerAuthorized
     requireFlightNotRegistered(getFlightKey(airlineAddress, flight, timestamp))  {
        bytes32 key = getFlightKey(airlineAddress, flight, timestamp);
        Flight memory newFlight =Flight(true, flight, timestamp, STATUS_CODE_UNKNOWN, timestamp, airlineAddress);
        flights[key] = newFlight;
        flightKeys.push(key);
        emit FlightRegistered(airlineAddress,flight, timestamp, key, STATUS_CODE_UNKNOWN);
    }

    function getFlightCount() external view requireIsOperational requireIsCallerAuthorized returns(uint){
        return flightKeys.length;
    }

    function getFlightDetails(uint index) external requireFlightRegistered(flightKeys[index]) view returns(address  airline , string memory flightName , uint timestamp , bytes32 flightKey, uint256 statusCode){
        bytes32 key = flightKeys[index];
        airline = flights[key].airline;
        flightName = flights[key].flightName;
        timestamp = flights[key].registerdTimestamp;
        statusCode = flights[key].registerdTimestamp;
        flightKey = key;
        
    }

    function processFlightStatus(address airline,string  calldata flight,uint256 timestamp,uint8 statusCode)
    external
    requireIsOperational
    requireIsCallerAuthorized
    requireFlightRegistered(getFlightKey(airline, flight, timestamp))
    requireFlightNotProcessed(getFlightKey(airline, flight, timestamp))
    {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        flights[flightKey].statusCode = statusCode;
        if (statusCode == STATUS_CODE_LATE_AIRLINE) {
            creditInsurees(flightKey);
        }
    }

   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy(address airline, string calldata flight, uint256 timestamp,address passengerAddress)
    external
    requireIsOperational
    requireIsCallerAuthorized
    requireFlightRegistered(getFlightKey(airline, flight, timestamp))
    payable
    {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        Flight storage flightToBuyFrom = flights[flightKey];
        flightToBuyFrom.insurances[passengerAddress] = msg.value;
        passengers.push(passengerAddress);
        emit InsuranceBought(flight,passengerAddress, msg.value );
    }


    /**
    * @dev Buy insurance for a flight
    *
    */   
    function getInsuredAmount(bytes32 flightKey,address passengerAddress)
    public
    view
    requireIsOperational
    requireFlightRegistered(flightKey)
    returns (uint insuredAmount)

    {
        insuredAmount = flights[flightKey].insurances[passengerAddress];
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees(bytes32 flightKey)
    internal
    requireIsOperational
    requireFlightRegistered(flightKey)
    {
        Flight storage flight = flights[flightKey];
        // loop over passengers and credit them their insurance amount
        for (uint i = 0; i < passengers.length; i++) {
            passengerInsuranceCredits[passengers[i]] += (flight.insurances[passengers[i]]*15)/100;
            emit InsuranceCredited(flight.flightName, passengers[i], flight.insurances[passengers[i]]);
        }
    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay(address payable passengerAddress) 
        external 
        requireIsOperational
        requireIsCallerAuthorized
        requirePassengerHasCredits(passengerAddress)
    {
         
        // Check modifier
        
        // Effect
        uint amount = passengerInsuranceCredits[passengerAddress];
        passengerInsuranceCredits[passengerAddress] = 0;
        // Interaction
        passengerAddress.transfer(amount);
        emit PaidPassenger(passengerAddress, amount);
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund
                            (   
                                address _airline,
                                uint256 _fund

                            )
                            public
                            requireIsOperational
                            requireIsCallerAuthorized
                            requireAirlineRegistered(_airline)
                            payable
    {
        airlines[_airline].funds = airlines[_airline].funds.add(_fund);
        contractAirlineDeposits = contractAirlineDeposits.add(_fund);

        // Change Airline to Funded if total funds become grether than equal to 10 ether
        if(airlines[_airline].funds >= 10 ether){
            airlines[_airline].airlineState = AirlineState.Funded;
            noOfAirlinesFunded++;
        }
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        pure
                        public
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }
    

    function fetchAirlineFund(address airlineAddress) public view returns (uint airlineState){
        airlineState = uint256(airlines[airlineAddress].airlineState);
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() 
                            external 
                            payable 
    {
        fund(msg.sender, msg.value);
    }


}

