const express = require('express');
const request = require('request');
const axios = require('axios');
const config = require('config');
const router = express.Router();
const auth = require('../../middleware/auth');
const { body, validationResult } = require('express-validator');
// bring in normalize to give us a proper url, regardless of what user entered
//const normalize = require('normalize-url');
const checkObjectId = require('../../middleware/checkObjectId');

const Profile = require('../../models/Profile');
const User = require('../../models/User');
//const Post = require('../../models/Post');

// @route    GET api/profile/me
// @desc     Get current users profile
// @access   Private
router.get('/me', auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({
      user: req.user.id
    }).populate('user', ['name', 'avatar']);

    if (!profile) {
      return res.status(400).json({ msg: 'There is no profile for this user' });
    }

    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    POST api/profile
// @desc     Create or update user profile
// @access   Private
router.post(
  '/',
  auth,
  body('status', 'Status is required').notEmpty(),
  body('skills', 'Skills is required').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      company,
      website,
      location,
      bio,
      status,
      githubusername,
      skills,
      youtube,
      facebook,
      twitter,
      instagram,
      linkedin
    } = req.body;

    //Build profile object
    const profileFields = {};
    profileFields.user = req.user.id;
    if(company) profileFields.company = company;
    if(website) profileFields.website = website;
    if(location) profileFields.location = location;
    if(bio) profileFields.bio = bio;
    if(status) profileFields.status = status;
    if(githubusername) profileFields.githubusername = githubusername;
    if(skills) {
      profileFields.skills = skills.split(',').map(skill => skill.trim());
    }
    profileFields.social = {};
    if(youtube) profileFields.social.youtube = youtube;
    if(facebook) profileFields.social.facebook = facebook;
    if(twitter) profileFields.social.twitter = twitter;
    if(instagram) profileFields.social.instagram = instagram;
    if(linkedin) profileFields.social.linkedin = linkedin;

    /* console.log(profileFields.skills);
    res.send('Hello'); */
    try {
      // Using upsert option (creates new doc if no match is found):
      let profile = await Profile.findOneAndUpdate(
        { user: req.user.id },
        { $set: profileFields },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      return res.json(profile);
    } catch (err) {
      console.error(err.message);
      return res.status(500).send('Server Error');
    }
  }
);

// @route    GET api/profile
// @desc     GET all profile
// @access   Public
router.get('/', async (req, res) => {
  try {
    const profiles = await Profile.find().populate('user', ['name', 'avatar']);
    res.json(profiles);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    GET api/profile/user/:user_id
// @desc     Get profile by user ID
// @access   Public
router.get(
  '/user/:user_id',
  async ( req, res) => {
    try {
      const profile = await Profile.findOne({ user:req.params.user_id }).populate('user', ['name', 'avatar']);

      if (!profile) return res.status(400).json({ msg: 'Profile not found' });

      return res.json(profile);
    } catch (err) {
      console.error(err.message);
      if(err.kind == 'ObjectId'){
        return res.status(400).json({ msg: 'Profile not found' });
      }
      return res.status(500).json({ msg: 'Server error' });
    }
  }
);

// @route    DELETE api/profile
// @desc     Delete profile, user & posts
// @access   Private
router.delete('/delete',
  auth,
  async( req,res) => {
    try{
      //Remove profile
      await Profile.findOneAndRemove({user: req.user.id});
      //Remove User
      await User.findOneAndRemove({_id: req.user.id});

      res.json({msg: 'User deleted'});
    }catch (err){
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route    PUT api/profile/experience
// @desc     Add profile experience
// @access   Private
router.put('/experience',
  auth,
    body('title','Title is required').notEmpty(),
    body('company', 'Company is required').notEmpty(),
    body('from', 'From date is required').notEmpty(),
  async(req, res) => {
     const errors =validationResult(req);
     if(!errors.isEmpty()){
       return res.status(400).json({ errors: errors.array() });
     }
     const{
       title,
       company,
       location,
       from,
       to,
       current,
       description
     } = req.body;

     const newExp = {
       title,
       company,
       location,
       from,
       to,
       current,
       description
     }

     try{
      const foundProfile = await Profile.findOne({ user: req.user.id });
      foundProfile.experience.unshift(newExp);

      await foundProfile.save();
      res.json(foundProfile);

    }catch (err){
      console.error(err.message);
      res.status(500).send('Server Error');
    }

});

// @route    PUT api/profile/experience
// @desc     Add profile experience
// @access   Private
router.delete('/experience/:exp_id', auth, async (req, res) => {
  try {
    const foundProfile = await Profile.findOne({ user: req.user.id });
    const removeIndex = foundProfile.experience.map(item => item.id).indexOf(req.params.exp_id);

    foundProfile.experience.splice(removeIndex, 1);

    await foundProfile.save();
    return res.status(200).json(foundProfile);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Server error' });
  }
});

// @route    PUT api/profile/education
// @desc     Add profile education
// @access   Private
router.put('/education',
  auth,
  body('school', 'School is required').notEmpty(),
  body('degree', 'Degree is required').notEmpty(),
  body('from', 'From date is required').notEmpty(),
  body('fieldofstudy', 'Field of study is required').notEmpty(),
  async(req, res) => {
     const errors =validationResult(req);
     if(!errors.isEmpty()){
       return res.status(400).json({ errors: errors.array() });
     }
     const{
       school,
       degree,
       fieldofstudy,
       from,
       to,
       current,
       description
     } = req.body;

     const newEdu = {
      school,
       degree,
       fieldofstudy,
       from,
       to,
       current,
       description
     }

     try{
      const foundProfile = await Profile.findOne({ user: req.user.id });
      foundProfile.education.unshift(newEdu);

      await foundProfile.save();
      res.json(foundProfile);

    }catch (err){
      console.error(err.message);
      res.status(500).send('Server Error');
    }

});

// @route    PUT api/profile/education
// @desc     Add profile education
// @access   Private
router.delete('/education/:edu_id', auth, async (req, res) => {
  try {
    const foundProfile = await Profile.findOne({ user: req.user.id });
    const removeIndex = foundProfile.experience.map(item => item.id).indexOf(req.params.edu_id);

    foundProfile.education.splice(removeIndex, 1);

    await foundProfile.save();
    return res.status(200).json(foundProfile);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Server error' });
  }
});

// @route    GET api/profile/github/:username
// @desc     Get user repos from Github
// @access   Public
router.get('/github/:username', async (req, res) => {
  try {
    const uri = encodeURI(
      `https://api.github.com/users/${req.params.username}/repos?per_page=5&sort=created:asc`
    );
    const headers = {
      'user-agent': 'node.js',
      Authorization: `token ${config.get('githubToken')}`
    };

    const gitHubResponse = await axios.get(uri, { headers });
    return res.json(gitHubResponse.data);
  } catch (err) {
    console.error(err.message);
    return res.status(404).json({ msg: 'No Github profile found' });
  }
});

module.exports = router;
