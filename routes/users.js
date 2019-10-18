const router = require("express").Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const passport = require("passport");

const secret = require("../config/keys").secretOrKey;

const validateRegisterInput = require("../utils/validation/registration");
const validateLoginInput = require("../utils/validation/login");
router.post("/register", (req, res) => {
  const { isValid, errors } = validateRegisterInput(req.body);
  if (!isValid) {
    return res.status(400).json(errors);
  }

  User.findOne({ email: req.body.email }).then(user => {
    if (user) {
      errors.email = "Email already exists!";
      res.status(409).json(errors);
    } else {
      const { name, email, phone, role, password } = req.body;

      const newUser = new User({
        name,
        email,
        phone,
        role,
        password
      });

      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(newUser.password, salt, (err, hash) => {
          newUser.password = hash;
          newUser
            .save()
            .then(user => {
              res.status(200).json(user);
            })
            .catch(err => {
              res.json(err);
            });
        });
      });
    }
  });
});

module.exports = router;

// @route   POST user/login
// @desc    login user
// @access  public

router.post("/login", (req, res) => {
  const { errors, isValid } = validateLoginInput(req.body);

  if (!isValid) {
    return res.status(400).json(errors);
  }

  const email = req.body.email;
  const password = req.body.password;

  User.findOne({ email })
    .then(user => {
      if (!user) {
        errors.email = "User does not exist";
        res.status(404).json(errors);
      }

      bcrypt.compare(password, user.password).then(isMatch => {
        if (isMatch) {
          const payload = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          };

          jwt.sign(payload, secret, { expiresIn: 14400 }, (err, token) => {
            res.json({
              success: true,
              token: "Bearer " + token
            });

            if (err) console.log(err);
          });
        } else {
          errors.password = "password incorrect";
          res.status(400).json(errors);
        }
      });
    })
    .catch(err => console.log(err));
});

router.post(
  "/verify-password",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const { password } = req.body;
    const { email } = req.user;
    User.findOne({ email }).then(user => {
      bcrypt
        .compare(password, user.password)
        .then(isMatch => res.status(200).send(isMatch));
    });
  }
);

// @route   POST user/
// @desc    get current user
// @access  private

router.get(
  "/",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const { _id, name, email, role, phone } = req.user;
    const user = {
      _id,
      name,
      email,
      role,
      phone
    };

    res.status(200).json(user);
  }
);

// @route   POST user/
// @desc    get all user
// @access  private (ADMIN ONLY)

router.get(
  "/all",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    if (req.user.role !== "ADMIN") {
      const errors = { auth: false };
      return res.status(403).json(errors);
    }

    User.find()
      .collation({ locale: "en" })
      .sort({ name: 1 })
      .exec()
      .then(users => {
        res.status(200).send(users);
      });
  }
);

// @route   POST user/
// @desc    get all user
// @access  private (ADMIN ONLY)

router.get(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    if (req.user.role !== "ADMIN") {
      const errors = { auth: false };
      return res.status(403).json(errors);
    }

    const { id } = req.params;

    User.findOne({ _id: id }).then(user => {
      res.status(200).send(user);
    });
  }
);
