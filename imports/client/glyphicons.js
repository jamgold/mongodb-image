import './glyphicons.html'
// import './glyphicons.css'
import './glyphicons.html'
import 'meteor/jamgold:bootstrap-glyphicons'
// console.log(__filename)
const MESSAGE_TIMEOUT = 5000

Template.glyphicons.onCreated(function () {
  const instance = this
  instance.timeout = null
  instance.message = new ReactiveVar('')
  instance.autorun((c)=>{
    const message = instance.message.get()
    if(message) {
      // console.log(c)
      if (instance.timeout) Meteor.clearTimeout(instance.timeout)
      instance.timeout = Meteor.setTimeout(() => {
        instance.message.set('')
      }, MESSAGE_TIMEOUT)
    }
  })
})
// Template.glyphicons.onRendered(function () {
//   const instance = this;
//   // console.log(`${instance.view.name}.${instance.getState()}`, instance.data);
// })
Template.glyphicons.onDestroyed(function () {
  const instance = this
  if (instance.timeout) Meteor.clearTimeout(instance.timeout)
})
Template.glyphicons.helpers({
  message(){
    return Template.instance().message.get()
  },
})
Template.glyphicons.events({
  'glyphicons:clipboard span.glyphicon'(e, instance) {
    const text = e.originalEvent.detail.text
    if (e.originalEvent.detail.success) {
        instance.message.set(`Added ${text} to clipboard`)
    } else {
        instance.message.set(e.originalEvent.detail.message)
    }
  },
})