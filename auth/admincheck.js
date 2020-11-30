function checkAdmin() {
  return function (req, res, next) {
    if (!req.isAuthenticated()) { res.redirect('/'); }
    if (req.user.type === "admin") {
      return next()
    }
    res.redirect('/dashboard')
  }
}

module.exports = checkAdmin