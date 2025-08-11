import React from 'react'
import { assets } from '../assets/assets'

const Hero = () => {
  return (
    <div className='flex flex-col sm:flex-row'>
        <img src={assets.hero_img} className='rounded-xl' alt="" />
    </div>
  )
}

export default Hero