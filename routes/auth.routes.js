const router = require("express").Router();
const passport = require("passport");

router.get("/google", passport.authenticate("google", { scope: ["profile"] }));

router.get("/google/callback", passport.authenticate("google"), (req, res) => {
  res.send("You have reaced the callback URI");
});

// this route is just used to get the user basic info
router.get("/user", (req, res, next) => {
  console.log("===== user!!======");
  console.log(req.user);
  if (req.user) {
    return res.json({ user: req.user });
  } else {
    return res.json({ user: null });
  }
});

router.post("/logout", (req, res) => {});

module.exports = router;
