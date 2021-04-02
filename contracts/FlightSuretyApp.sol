pragma solidity ^0.5.0;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/
import "../node_modules/@openzeppelin/contracts/math/SafeMath.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

  

    address private contractOwner;      // Account used to deploy contract
    bool private operational = true;    // Blocks all state changes throughout the contract if false

  

    struct AirlineVotes {
         bool exists;
         address[] otherAirlineVotes; 
    }
   
    mapping(address => AirlineVotes) internal votes;  

    FlightSuretyData flightSuretyData;
     /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/
   event AirlineVoted(address votingAirline, address votedAirline);

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
     * @dev Modifier that requires the "operational" boolean variable to be "true"
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
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

     modifier requireAirlineFunded() {
        require(
            flightSuretyData.isAirlineFunded(msg.sender),
            "Airline must be funded to perform this action"
        );
        _;
    }

  

     modifier requireAirlineNotRegistered(address newAirline) {
        require(
            !flightSuretyData.isAirlineRegistered(newAirline),
            "Airline should  not exist"
        );
        _;
    }

     modifier requireFlightRegistered(string memory flight,uint256 timestamp ) {

        require(flightSuretyData.isFlightRegistered(msg.sender, flight, timestamp), "Flight should be registered");
        _;
    }

    modifier requireFlightNotRegistered(string memory flight,uint256 timestamp ) {
        require(!flightSuretyData.isFlightRegistered(msg.sender, flight, timestamp), "Flight should not be registered");
        _;
    }

    modifier checkMaxInsuranceCost(){
        require(msg.value <= 1 ether, "Maximum allowed insurance amount is 1 ether");

        _;
    }

    

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
     * @dev Contract constructor
     *
     */
    constructor(address dataContractAddress) public {
        operational = true;
        contractOwner = msg.sender;
        flightSuretyData = FlightSuretyData(dataContractAddress);
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational() public view returns (bool) {
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
    * @dev Check if Airline is funded
    *
    * @return A bool that is the Airline Funded
    */      
    function isAirlineFunded(address airlineAddress) 
                            public 
                            view 
                            requireIsOperational
                            
                            returns(bool) 
    {
        return   flightSuretyData.isAirlineFunded(airlineAddress);
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

      /**
     * @dev Vote an airline 
     *
     */

    function voteAirline(address airlineAddress)
        external
        requireIsOperational
        requireAirlineFunded
        requireAirlineNotRegistered(airlineAddress)
    {
            bool isDuplicate = false;
            for (uint i=0; i < votes[airlineAddress].otherAirlineVotes.length; i++) {
                if (votes[airlineAddress].otherAirlineVotes[i] == msg.sender) {
                    isDuplicate = true;
                    break;
                }
            }
            require(!isDuplicate, "Caller cannot call this function twice");
            votes[airlineAddress].otherAirlineVotes.push(msg.sender);
            votes[airlineAddress].exists = true;
            emit AirlineVoted( msg.sender,  airlineAddress);
    }

    /**
     * @dev Add an airline to the registration queue
     *
     */

    function registerAirline(address _newAirlineAddress)
        external
        requireIsOperational
        
      
    {
        // Any funded airline can  register a new airline  if registered airline is less than 4
        if (flightSuretyData.noOfAirlinesRegistered() < 4) {
            flightSuretyData.registerAirline(_newAirlineAddress, msg.sender);
        }else{
            //Multiparty consensus
            require(votes[_newAirlineAddress].exists  && votes[_newAirlineAddress].otherAirlineVotes.length >= flightSuretyData.noOfAirlinesFunded().div(2), "Airline doesn't have enough votes");
            flightSuretyData.registerAirline(_newAirlineAddress, msg.sender);
        }
    }

    function getNofOfVotes(address airlineAdd) public view returns(uint count){
        count = votes[airlineAdd].otherAirlineVotes.length;

    }

    function getAirlineRegisteredCount() public view returns(uint airlineCount){
        airlineCount = flightSuretyData.noOfAirlinesRegistered();
    }

    function getAirlineFundedCount() public view returns(uint airlineCount){
        airlineCount = flightSuretyData.noOfAirlinesFunded();
    }

    function getFlightCount() public view returns(uint flightCount){
        flightCount = flightSuretyData.getFlightCount();
    }

    function getFlightDetails(uint index) public view returns(address  airline , string memory flightName , uint timestamp , bytes32 flightKey, uint8 statusCode){

        (airline, flightName, timestamp, flightKey, statusCode) = flightSuretyData.getFlightDetails(index);
    }

    /**
     * @dev Accept fund from airline 
     */

    function fund()
    external
    requireIsOperational
    payable
    {
        flightSuretyData.fund(msg.sender, msg.value );
    }

    /**
     * @dev Add an airline to the registration queue
     *
     */

    function registerFlight(string calldata flight, uint timestamp)
        external
        requireIsOperational
        requireAirlineFunded
    {
         flightSuretyData.registerFlight( msg.sender , flight, timestamp);
    }


    /**
     * @dev Buy an airline insurance
     *
     */
    function buy(address airline, string calldata flight, uint256 timestamp) external checkMaxInsuranceCost payable{
       
       
        flightSuretyData.buy.value(msg.value)(airline, flight, timestamp, msg.sender);
    }

    /**
     * @dev withdraw insurance credits
     *
     */

     function withdraw() external
    {
      
        flightSuretyData.pay(msg.sender);
    }

   

    /**
     * @dev Called after oracle has updated flight status
     *
     */

    function processFlightStatus(
        address airline,
        string memory flight,
        uint256 timestamp,
        uint8 statusCode
    ) internal requireIsOperational {
        
         flightSuretyData.processFlightStatus(airline,flight,timestamp, statusCode );
    }
    

    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus(
        address airline,
        string calldata flight,
        uint256 timestamp
    ) external {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key =
            keccak256(abi.encodePacked(index, airline, flight, timestamp));
        oracleResponses[key] = ResponseInfo({
            requester: msg.sender,
            isOpen: true
        });

        emit OracleRequest(index, flight, airline, timestamp);
    }

    // region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;

    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester; // Account that requested status
        bool isOpen; // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses; // Mapping key is the status code reported
        // This lets us group responses and identify
        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    event OracleRegistered(uint8[3] indexes);

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(
        address airline,
        string flight,
        uint256 timestamp,
        uint8 status
    );

    event OracleReport(
        address airline,
        string flight,
        uint256 timestamp,
        uint8 status
    );

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(
        uint8 index,
        string flight,
        address airline,
        uint256 timestamp
    );

    // Register an oracle with the contract
    function registerOracle() external payable {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({isRegistered: true, indexes: indexes});
        emit OracleRegistered(indexes);
    }

    function getMyIndexes() external view returns (uint8[3] memory) {
        require(
            oracles[msg.sender].isRegistered,
            "Not registered as an oracle"
        );

        return oracles[msg.sender].indexes;
    }

    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    event checkResponseLength(uint reponseLength);
    function submitOracleResponse(
        uint8 index,
        address airline,
        string calldata flight,
        uint256 timestamp,
        uint8 statusCode
    ) external {
        require(
            (oracles[msg.sender].indexes[0] == index) ||
                (oracles[msg.sender].indexes[1] == index) ||
                (oracles[msg.sender].indexes[2] == index),
            "Index does not match oracle request"
        );

        bytes32 key =
            keccak256(abi.encodePacked(index, airline, flight, timestamp));
        require(
            oracleResponses[key].isOpen,
            "Flight or timestamp do not match oracle request"
        );

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
       
        if (
            oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES
        ) {
             emit checkResponseLength(oracleResponses[key].responses[statusCode].length);
            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(airline, flight, timestamp, statusCode);
        }
    }

  

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes(address account) internal returns (uint8[3] memory) {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);

        indexes[1] = indexes[0];
        while (indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while ((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex(address account) internal returns (uint8) {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random =
            uint8(
                uint256(
                    keccak256(
                        abi.encodePacked(
                            blockhash(block.number - nonce++),
                            account
                        )
                    )
                ) % maxValue
            );

        if (nonce > 250) {
            nonce = 0; // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

    // endregion
}

    contract FlightSuretyData {

        function registerAirline(address _newAirlineAddress, address _registeredByAddress) external;
        function fund(address _airline, uint256 _fund) external payable;
        function isAirlineFunded(address airlineAddress) external view returns (bool);
        function isAirlineRegistered(address airlineAddress) external view returns (bool);
        function noOfAirlinesFunded() external view returns (uint);
        function noOfAirlinesRegistered() external view returns (uint);
        function getFlightCount() external view returns (uint);
        function isFlightRegistered(address airlineAddress,string  calldata flight,uint256 timestamp) external view returns (bool);
        function registerFlight( address airlineAddress ,string calldata flight,uint256 timestamp) external;
        function buy(address airline, string calldata flight, uint256 timestamp,address passengerAddress) external payable;
        function processFlightStatus(address airline,string calldata flight,uint256 timestamp,uint8 statusCode) external;
        function pay(address passengerAddress) external ;
        function getFlightDetails(uint index) external view returns (address  airline , string memory flightName , uint timestamp , bytes32 flightKey, uint8 statusCode) ;
        
    }

