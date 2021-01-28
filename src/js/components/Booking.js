import { templates, select, settings, classNames} from '../settings.js';
import utils from '../utils.js';
import AmountWidget from './amountWidget.js';
import DatePicker from './DatePicker.js';
import HourPicker from './HourPicker.js';

class Booking {
  constructor(element) {
    const thisBooking = this;
    thisBooking.render(element);
    thisBooking.initWidgets();
    thisBooking.getData();
  }

  getData(){
    const thisBooking = this;

    const startDateParam = settings.db.dateStartParamKey + '=' + utils.dateToStr(thisBooking.datePicker.minDate);
    const endDateParam = settings.db.dateEndParamKey + '=' + utils.dateToStr(thisBooking.datePicker.maxDate);

    const params = {
      booking: [
        startDateParam,
        endDateParam,
      ],
      eventsCurrent: [
        settings.db.notRepeatParam,
        startDateParam,
        endDateParam,
      ],
      eventsRepeat: [
        settings.db.repeatParam,
        endDateParam,
      ],
    };


    const urls = {
      booking:       settings.db.url  + '/' + settings.db.booking
                                      + '?' + params.booking.join('&'),
      eventsCurrent: settings.db.url  + '/' + settings.db.event
                                      + '?' + params.eventsCurrent.join('&'),
      eventsRepeat:   settings.db.url + '/' + settings.db.event
                                      + '?' + params.eventsRepeat.join('&'),
    };

    Promise.all([
      fetch(urls.booking),
      fetch(urls.eventsCurrent),
      fetch(urls.eventsRepeat),
    ])
      .then(function(allResponses){
        const bookingsResponse = allResponses[0];
        const eventsCurrentResponse = allResponses[1];
        const eventsRepeatResponse = allResponses[2];
        return Promise.all([
          bookingsResponse.json(),
          eventsCurrentResponse.json(),
          eventsRepeatResponse.json(),
        ]);
      })
      .then(function([bookings, eventsCurrent, eventsRepeat]){
        thisBooking.parseData(bookings, eventsCurrent, eventsRepeat);
      });
  }

  parseData(bookings, eventsCurrent, eventsRepeat){
    const thisBooking = this;

    thisBooking.booked = {};

    for(let item of eventsCurrent){
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }

    for(let item of bookings){
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }
    const minDate = thisBooking.datePicker.minDate;
    const maxDate = thisBooking.datePicker.maxDate;

    for(let item of eventsRepeat){
      if(item.repeat == 'daily'){
        for(let loopDate = minDate; loopDate <= maxDate; loopDate = utils.addDays(loopDate, 1)){
          thisBooking.makeBooked(utils.dateToStr(loopDate), item.hour, item.duration, item.table);
        }
      }
    }
    thisBooking.updateDOM();
  }

  makeBooked(date, hour, duration, table){
    const thisBooking = this;

    if(typeof thisBooking.booked[date] == 'undefined'){
      thisBooking.booked[date] = {};
    }

    const startHour = utils.hourToNumber(hour);

    for(let hourBlock = startHour; hourBlock < startHour + duration; hourBlock += 0.5){

      if(typeof thisBooking.booked[date][hourBlock] == 'undefined'){
        thisBooking.booked[date][hourBlock] = [];
      }

      thisBooking.booked[date][hourBlock].push(table);
    }
  }

  updateDOM(){
    const thisBooking = this;

    thisBooking.date = thisBooking.datePicker.value;
    thisBooking.hour = utils.hourToNumber(thisBooking.hourPicker.value);

    let allAvailable = false;

    if(
      typeof thisBooking.booked[thisBooking.date] == 'undefined'
      ||
      typeof thisBooking.booked[thisBooking.date][thisBooking.hour] == 'undefined'
    ){
      allAvailable = true;
    }

    for(let table of thisBooking.dom.tables){
      let tableId = table.getAttribute(settings.booking.tableIdAttribute);
      if(!isNaN(tableId)){
        tableId = parseInt(tableId);
      }
      if(
        !allAvailable
        &&
        thisBooking.booked[thisBooking.date][thisBooking.hour].includes(tableId)
      ){
        table.classList.add(classNames.booking.tableBooked);
      } else {
        table.classList.remove(classNames.booking.tableBooked);
      }
    }
  }

  render(element){
    const thisBooking = this;

    const generatedHTML = templates.bookingWidget();

    thisBooking.dom = {};
    thisBooking.dom.wrapper = element;
    element.innerHTML = generatedHTML;
    thisBooking.starters = [];
    thisBooking.selectedTable = null;

    thisBooking.dom.peopleAmount = document.querySelector(select.booking.peopleAmount);
    thisBooking.dom.hoursAmount = document.querySelector(select.booking.hoursAmount);
    thisBooking.dom.datePicker = document.querySelector(select.widgets.datePicker.wrapper);
    thisBooking.dom.hourPicker = document.querySelector(select.widgets.hourPicker.wrapper);
    thisBooking.dom.tables = document.querySelectorAll(select.booking.tables);
    thisBooking.dom.widgetDiv = document.querySelector(select.booking.widgetDiv);
    thisBooking.dom.allTables = document.querySelector(select.booking.allTables);
    thisBooking.dom.phone = document.querySelector(select.booking.phone);
    thisBooking.dom.address = document.querySelector(select.booking.address);
    thisBooking.dom.orderButton = document.querySelector(select.booking.orderButton);
    thisBooking.dom.starters = document.querySelector(select.booking.starters);
  }

  initWidgets(){
    const thisBooking = this;

    thisBooking.peopleAmount = new AmountWidget(thisBooking.dom.peopleAmount);
    thisBooking.hoursAmount = new AmountWidget(thisBooking.dom.hoursAmount);

    thisBooking.datePicker = new DatePicker(thisBooking.dom.datePicker);
    thisBooking.hourPicker = new HourPicker(thisBooking.dom.hourPicker);

    thisBooking.dom.wrapper.addEventListener('updated', function(){
      thisBooking.updateDOM();
    });

    thisBooking.dom.allTables.addEventListener('click', function(event){
      thisBooking.bookTable(event);
    });

    thisBooking.dom.orderButton.addEventListener('click', function(event){
      event.preventDefault();
      thisBooking.sendBooking();
    });

    thisBooking.dom.starters.addEventListener('click', function(event){
      const clickedElement = event.target;
      if(clickedElement.tagName == 'INPUT' && clickedElement.type == 'checkbox' && clickedElement.name == 'starter'){
        if(clickedElement.checked){
          thisBooking.starters.push(clickedElement.value);
        }
        else {
          const index = thisBooking.starters.indexOf(clickedElement.value);
          thisBooking.starters.splice(index, 1);
        }
      }
    });

    thisBooking.dom.widgetDiv.addEventListener('updated', function(){
      thisBooking.updateDOM();
      thisBooking.initTables();
    });
  }

  initTables(){
    const thisBooking = this;

    for(let table of thisBooking.dom.tables){
      if(table.classList.contains(classNames.booking.tableClicked)){
        table.classList.remove(classNames.booking.tableClicked);
      }
    }
  }

  bookTable(event){
    const thisBooking = this;

    const clickedElement = event.target;

    if(clickedElement.classList.contains(classNames.booking.table)){
      const tableAttribute = clickedElement.getAttribute('data-table');
      console.log(clickedElement);
      if(!clickedElement.classList.contains(classNames.booking.tableClicked) && !clickedElement.classList.contains(classNames.booking.tableBooked)){
        for(let table of thisBooking.dom.tables){
          if(table.classList.contains(classNames.booking.tableClicked)){
            table.classList.remove(classNames.booking.tableClicked);
          } else {
            clickedElement.classList.add(classNames.booking.tableClicked);
            thisBooking.selectedTable = tableAttribute;
          }
        }
      }
      else if(!clickedElement.classList.contains(classNames.booking.tableBooked)
      && clickedElement.classList.contains(classNames.booking.tableClicked))
      {
        clickedElement.classList.remove(classNames.booking.tableClicked);
      }
      else if (clickedElement.classList.contains(classNames.booking.tableBooked)){
        alert('This table has already been booked');
      }
      console.log(thisBooking.selectedTable, tableAttribute);
    }
  }

  sendBooking(){
    const thisBooking = this;

    const url = settings.db.url + '/' + settings.db.booking;

    const payload = {
      date: thisBooking.date,
      hour: thisBooking.hourPicker.value,
      table: parseInt(thisBooking.selectedTable),
      duration: thisBooking.hoursAmount.value,
      ppl: thisBooking.peopleAmount.value,
      starters: [],
      phone: thisBooking.dom.phone.value,
      address: thisBooking.dom.address.value,
    };

    for(let starter of thisBooking.starters) {
      payload.starters.push(starter);
    }
    console.log(payload);

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    };

    fetch(url, options)
      .then(function(){
        thisBooking.makeBooked(payload.date, payload.hour, payload.duration, parseInt(payload.table));
      })
      .then(function(){
        console.log(thisBooking.booked);
      });
    // .then(console.log(thisBooking.makeBooked(payload.date, payload.hour, payload.duration, parseInt(payload.table))));
  }
}

export default Booking;
