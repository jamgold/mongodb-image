import { EJSON } from 'meteor/ejson';
import './errors.html';

Template.registerHelper('debug', () => {
    return EJSON.stringify(Template.currentData(),{indent:4})
})
