const User = require('../models/User');
const bcrypt = require('bcryptjs');


//create a user
exports.createUser = async (req, res) => {
  try {
    //request body
    const { name, email, password,role,} = req.body;
    console.log('Request body:', req.body); // Log the request body for debugging

    //check if all required fields are provided
    if (!name || !email || !password) {
      return res.status(400).json({  message: 'Please provide all required fields' });
    } 
        
    //email check
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    //encrypt password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    //create new user
    const user = new User({
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword, 
      role: req.body.role, // Default role is 'user' if not provided
    });

    await user.save(); //save the user to the database

    const safeUser = user.toObject();
    delete safeUser.password;

    res.status(201).json({ message: 'User created successfully', user: safeUser });

  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }       

};


//login user
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;   

    //check if all required fields are provided
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    //check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    //check if password is correct
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid password' });
    }

      //generate a token using JWT
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: user._id, email: user.email, name: user.name, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
};
