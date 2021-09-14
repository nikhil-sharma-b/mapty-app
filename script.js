"use strict";

// Parent class
const Workout = class {
  date = new Date();
  id = (Date.now() + "").slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
};

// Child classes: "Running" and "Cycling"
const Running = class extends Workout {
  type = "running";
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
};

const Cycling = class extends Workout {
  type = "cycling";
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/hr
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
};

////////////////////////////////////////////////////////////
// APPLICATION ARCHITECTURE
const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");

const App = class {
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoomLevel = 15;

  constructor() {
    // Get user position
    this._getPosition();

    // Get data from the local storage
    this._getLocalStorage();

    // Handling submissions
    form.addEventListener("submit", this._newWorkout.bind(this));
    // Changing the dropdown
    inputType.addEventListener("change", this._toggleElevationField);
    containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));
  }

  _getPosition() {
    // Get current Position (using the Geolocation API)
    navigator.geolocation?.getCurrentPosition(
      this._loadMap.bind(this),
      function () {
        alert("Could not find your location");
      }
    );
  }

  _loadMap(position) {
    const { longitude } = position.coords;
    const { latitude } = position.coords;

    const coords = [latitude, longitude];

    // Leaflet code
    this.#map = L.map("map").setView(coords, this.#mapZoomLevel);

    L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // The leaflet version of addEventListener (we use this because we need to get the coords at the mouse click location)
    // Handling clicks on map
    this.#map.on("click", this._showForm.bind(this));

    // Render local storage markers on the map
    this.#workouts.forEach((work) => this._renderWorkoutMarker(work));
  }

  _showForm(mapE) {
    // Enabling the form on map-click
    this.#mapEvent = mapE;
    form.classList.remove("hidden");
    inputDistance.focus();
  }

  _hideForm() {
    // Clearing the input fields
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        "";

    // Prevent slide animation
    form.style.display = "none";
    form.classList.add("hidden");
    setTimeout(() => (form.style.display = "grid"), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
  }

  _newWorkout(e) {
    e.preventDefault();

    // Helper functions
    const validInputs = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));
    const allPositives = (...inputs) => inputs.every((inp) => inp > 0);

    // Get data from the form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const cadence = +inputCadence.value;
    const elevation = +inputElevation.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // if workout - running, create running object
    if (type === "running") {
      // Check if data is valid (guard clause)
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositives(distance, duration, cadence)
      )
        return alert("Input have to be positive numbers!");

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // if workout - cycling, create cycling object
    if (type === "cycling") {
      // Check if data is valid (guard clause)
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositives(distance, duration) // elevation can be negative
      )
        return alert("Input have to be positive numbers!");

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add the new object to the workouts array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide the form
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${workout.description}</h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>`;

    if (workout.type === "running") {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>`;
    }

    if (workout.type === "cycling") {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>`;
    }

    form.insertAdjacentHTML("afterend", html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest(".workout");

    // Guard clause
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      (work) => work.id === workoutEl.dataset.id
    );
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("workouts"));

    // Guard clause
    if (!data) return;

    this.#workouts = data;
    this.#workouts.forEach((work) => this._renderWorkout(work));
  }

  reset() {
    localStorage.removeItem("workouts");
    location.reload();
  }
};

// Creating the "app" object
const app = new App();
