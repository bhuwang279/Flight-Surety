import DOM from "./dom";
import Contract from "./contract";
import "./flightsurety.css";
window.flights = [];
(async () => {
  let result = null;
  var passengerSection = DOM.elid("passengerSection");
  passengerSection.style.display = "none";
  let loader = `<div class="spinner-border text-success" role="status">
  <span class="sr-only">Loading...</span>
</div>`;

  let contract = new Contract("localhost", () => {
    DOM.elid("fund-airline").addEventListener("click", () => {
      DOM.elid("fund-airline").innerHTML = "Processing";
      let amount = DOM.elid("funding-airline-amount").value;
      // Write transaction
      contract.fundAirline(amount, (error, result) => {
        DOM.elid("fund-airline").innerHTML = "Fund";
        console.log("funding error", error);
        console.log("funding result", result);
      });
    });

    DOM.elid("register-airline").addEventListener("click", () => {
      DOM.elid("register-airline").innerHTML = "Processing";
      let airline = DOM.elid("registering-airline-address").value;
      // Write transaction
      contract.registerAirline(airline, (error, result) => {
        DOM.elid("register-airline").innerHTML = "Register";
        console.log("register error", error);
        console.log("register result", result);
      });
    });

    DOM.elid("vote-airline").addEventListener("click", () => {
      DOM.elid("vote-airline").innerHTML = "Processing";
      let airline = DOM.elid("voting-airline-address").value;
      // Write transaction
      contract.voteAirline(airline, (error, result) => {
        DOM.elid("vote-airline").innerHTML = "Vote";
        console.log("vote error", error);
        console.log("vote result", result);
      });
    });

    DOM.elid("register-flight").addEventListener("click", () => {
      let flight = DOM.elid("registering-flight-name").value;
      // Write transaction
      DOM.elid("register-flight").innerHTML = "Processing";
      contract.registerFlight(flight, async (error, result) => {
        DOM.elid("register-flight").innerHTML = "Register";
        console.log("flight register  error", error);
        console.log("flight register  result", result);
        if (!error) {
          DOM.elid("flight-list").innerHTML = "Register";
          await fetchAndAppendFlights();
        }
      });
    });

    DOM.elid("buy-insurance").addEventListener("click", () => {
      let amount = DOM.elid("insurance-amount").value;
      if (!amount) {
        alert("Please enter amoiunt less than 1");
        return;
      }
      let flightKey = DOM.elid("flight-list").value;
      if (flightKey) {
        const flight = (window.flights || []).find(
          (flight) => flight.key === flightKey
        );
        if (flight) {
          // Write transaction
          DOM.elid("buy-insurance").innerHTML = "Processing";
          contract.buyInsurance(flight, amount, async (error, result) => {
            DOM.elid("buy-insurance").innerHTML = "Buy";
            console.log("buy insurance  error", error);
            console.log("buy insurance  result", result);
          });
        } else {
          alert("invalid flight");
        }
      } else {
        alert("invalid flight");
      }
    });

    DOM.elid("withdraw-credits").addEventListener("click", () => {
      // Write transaction
      DOM.elid("withdraw-credits").innerHTML = "Processing";
      contract.withdraw(async (error, result) => {
        DOM.elid("withdraw-credits").innerHTML = "Withdraw";
        console.log("error", error);
        console.log("register  result", result);
      });
    });
    // Read transaction
    contract.isOperational((error, result) => {
      console.log(error, result);
      display("Operational Status", "Check if contract is operational", [
        { label: "Operational Status", error: error, value: result },
      ]);
    });
    // User-submitted transaction
    DOM.elid("submit-oracle").addEventListener("click", () => {
      let flightKey = DOM.elid("oracle-flight-list").value;
      if (flightKey) {
        const flight = (window.flights || []).find(
          (flight) => flight.key === flightKey
        );
        if (flight) {
          DOM.elid("submit-oracle").innerHTML = "Processing";
          // Write transaction
          contract.fetchFlightStatus(flight, (error, result) => {
            DOM.elid("submit-oracle").innerHTML = "Submit To Oracles";
            console.log(result);
          });
        } else {
          alert("Invalid Flight selected");
        }
      } else {
        alert("Invalid Flight selected");
      }
    });
    const fetchAndAppendFlights = async () => {
      window.flights = [];
      fetch("http://localhost:3000/flights")
        .then((res) => {
          return res.json();
        })
        .then((flights) => {
          flights.forEach((flight) => {
            window.flights.push(flight);
            let { flightName, key } = flight;

            // append flight to passenger selection list
            let flightList = DOM.elid("flight-list");
            let option = DOM.option({
              value: `${key}`,
              text: `${flightName}`,
            });
            flightList.appendChild(option);
            let oracleFlightlist = DOM.elid("oracle-flight-list");
            let oracleFlightOptions = DOM.option({
              value: `${key}`,
              text: `${flightName}`,
            });
            oracleFlightlist.appendChild(oracleFlightOptions);
          });
        });
    };
    fetchAndAppendFlights();
  });
})();

DOM.elid("selectSection").addEventListener("change", () => {
  let sectionValue = DOM.elid("selectSection").value;
  var airlineSection = DOM.elid("airlineSection");
  var passengerSection = DOM.elid("passengerSection");
  if (sectionValue === "1") {
    airlineSection.style.display = "flex";
  } else {
    airlineSection.style.display = "none";
  }
  if (sectionValue === "2") {
    passengerSection.style.display = "flex";
  } else {
    passengerSection.style.display = "none";
  }
});

function display(title, description, results) {
  let displayDiv = DOM.elid("display-wrapper");
  let section = DOM.section();
  section.appendChild(DOM.h2(title));
  section.appendChild(DOM.h5(description));
  results.map((result) => {
    let row = section.appendChild(DOM.div({ className: "row" }));
    row.appendChild(DOM.div({ className: "col-sm-2 field" }, result.label));
    row.appendChild(
      DOM.div(
        { className: "col-sm-8 field-value" },
        result.error ? String(result.error) : String(result.value)
      )
    );
    section.appendChild(row);
  });
  displayDiv.append(section);
}
