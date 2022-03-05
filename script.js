'use strict';

class workout {
  date = new Date();
  id = (Date.now() + '').slice(-10); // by Date.now we will get current timestamp.
  clicks = 0;
  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 
    'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace(); // here we called calcPace method in custructor.
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    // this.cycling = cycling; // same as we did before constructor
    this.calcSpeed(); // here we called calcSpeed method in custructor.
    this._setDescription();
  }

  calcSpeed() {
    // km/hr
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// // just for experiment
// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cycling1);

//////////////////////////////////
// APPLICATION ARCHITECTURE
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Attach Event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField); // here we dont need to bind coz no 'this' is used in its down.
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this), // we bind here 'this' points to current obj(app),we also want 'this' in _loadMap
        function () {
          // this._loadMap is 'success' f, and other one is an 'error' f here.
          alert('Could not get your position');
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords; // de-structuring
    const { longitude } = position.coords;
   
    //console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel); // 'L' is a name-space of leaflet and in ('Id') of html.
    
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    // Render workouts Marker as Map loads
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    // 'on' method is not a feature of JS, it is in event.
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // Empty inputs
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp)); // helper function for conditions.
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value; // coverted this into number(+), coz it comes in string.
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout is Running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence) // more neat way of doing is down.
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Input should be a positive number');
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout is cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // Check if data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Input should be a positive number');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);


    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form + clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 300,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`, // added these all object-methods from leaflet-docs popup methods
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      ) // leaflet-docs popup methods
      .openPopup();
  }
  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id=${workout.id}>
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;
    if (workout.type === 'running')
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
    </li>
      `;

    if (workout.type === 'cycling')
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
  </li>
      `;

    form.insertAdjacentHTML('afterend', html);
  }
  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    // console.log(workoutEl);

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

     this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    // localStorage(key, value) is called local storage Api.
    localStorage.setItem('workouts', JSON.stringify(this.#workouts)); 
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts')); 
    // console.log(data);

    if (!data) return; // Guard clause

    this.#workouts = data; 

    // Render workouts on list when page loads
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
      });
  }

  // Public method, to remove all workouts/ reset app.
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}
const app = new App(); 

