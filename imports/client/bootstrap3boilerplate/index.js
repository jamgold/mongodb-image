global.Bootstrap3boilerplate = {
  __alert: new ReactiveVar([]),
  __invisible: [],
  __garbageCollect: 10,
  _alertTypes:[
    "primary",
    "secondary",
    "success",
    "danger",
    "warning",
    "info",
    "light",
    "dark",
  ],
  alert: function (type, text, autohide) {
    const alertid = Random.id()
    const time = new Date()
    type = _.indexOf(Bootstrap3boilerplate._alertTypes, type) >= 0 ? type : 'info'
    autohide = autohide === undefined ? true : autohide === true
    // console.log(`alert ${alertid} ${autohide}`)
    var alerts = Bootstrap3boilerplate.__alert.get()
    if (alerts === undefined) alerts = [];
    alerts.push({
      type: type,
      text: text,
      autohide: autohide,
      alertid: alertid,
      background: 'white',
      time: time.toLocaleString()
    });
    Bootstrap3boilerplate.__alert.set(alerts)
    document.getElementById('alerts').removeAttribute('style','display')
    return alertid
  },
  removeAlert: function (alertid) {
    if(alertid) {
      this.__invisible.push(alertid)
      const alerts = this.__alert.get()
      // console.log(`removeAlert ${this.__invisible.length} == ${alerts.length}`)
      if(this.__invisible.length == alerts.length) {
        // console.log(`removeAlert resetting`)
        this.__invisible = []
        this.__alert.set([])
        document.getElementById('alerts').setAttribute('style','display: none !important')
      }
    }
  },
}
