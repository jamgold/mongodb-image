import './toast.html'

Template.toast.onRendered(function(){
  const instance = this
  const $toast = instance.$('.toast')
  // console.log(`creating toast ${instance.data.alertid}`)
  if(instance.data.autohide)
    $toast.toast({autohide: true, delay: 8000})
  else
    $toast.toast({autohide: false})
  $toast.toast('show')
  $toast.on('hidden.bs.toast', function () {
    // do something...
    // console.log(`removeAlert ${this.dataset.alertId}`)
    Bootstrap3boilerplate.removeAlert(this.dataset.alertId)
  })
})
Template.toast.onDestroyed(function(){
  const instance = this
})