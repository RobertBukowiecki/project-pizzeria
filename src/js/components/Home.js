import {templates, select, classNames} from '../settings.js';
import Carousel from './Carousel.js';

class Home {
  constructor(element){
    const thisHome = this;

    thisHome.render(element);
    thisHome.initWidget();
    thisHome.initActions();
  }
  render(element){
    const thisHome = this;

    const generatedHTML = templates.homePage();

    thisHome.dom = {};
    thisHome.dom.wrapper = element;
    element.innerHTML = generatedHTML;
    thisHome.dom.carouselWrapper = element.querySelector(select.widgets.carousel.wrapper);
    thisHome.dom.orderButton = element.querySelector(select.home.orderButton);
    thisHome.dom.bookButton = element.querySelector(select.home.bookButton);
    thisHome.pages = document.querySelector(select.containerOf.pages).children;
    thisHome.navLinks = document.querySelectorAll(select.nav.links);
  }
  initWidget(){
    const thisHome = this;

    thisHome.carouselWrapper = new Carousel(thisHome.dom.carouselWrapper);
  }
  initActions(){
    const thisHome = this;

    thisHome.dom.orderButton.addEventListener('click', function(event){
      event.preventDefault();
      thisHome.pages[0].classList.remove(classNames.pages.active);
      thisHome.navLinks[0].classList.remove(classNames.nav.active);
      thisHome.pages[1].classList.add(classNames.pages.active);
      thisHome.navLinks[1].classList.add(classNames.nav.active);
    });

    thisHome.dom.bookButton.addEventListener('click', function(event){
      event.preventDefault();
      thisHome.pages[0].classList.remove(classNames.pages.active);
      thisHome.navLinks[0].classList.remove(classNames.nav.active);
      thisHome.pages[2].classList.add(classNames.pages.active);
      thisHome.navLinks[2].classList.add(classNames.nav.active);
    });
  }
}

export default Home;
