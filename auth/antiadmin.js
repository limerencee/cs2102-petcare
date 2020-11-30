function checkNotAdmin() {
    return function (req, res, next) {
      if (!req.isAuthenticated()) { res.redirect('/'); }
      if (req.user.type !== "admin") {
        return next()
      }
      res.redirect('/admin_dashboard')
    }
  }
  
  module.exports = checkNotAdmin