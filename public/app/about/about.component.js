import {textField, snackbar} from 'material-components-web'
import AboutController from './about.controller'

var template = require('./about.html')
var bindings = {};
var controller = AboutController

export {
  template,
  bindings,
  controller
}