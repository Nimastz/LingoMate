import React, { Fragment } from 'react';
import p1 from '../img/pic/1.png';
import p2 from '../img/pic/2.png'
import p3 from '../img/pic/3.png'
import p4 from '../img/pic/4.png'

import cancel from '../img/cancel.png'

export const Avatar = ({ isOpen, onClose, children }) => {
  return (
    
    <div className='Avatar'>
      <Fragment>
      {isOpen && (
        <div className="overlay">
          <div className="overlay__background" onClick={onClose} />
          <div className="overlay__container">
            <div className="overlay__controls">
            <div className='pics'>
            <img className="img" src= {p1} alt="" />
            <img className="img" src= {p2} alt="" />
            <img className="img" src= {p3} alt="" />
            <img className="img" src= {p4} alt="" />
          </div>
            <img className='cancel' src= {cancel} onClick={onClose} alt=""/>  
            </div>
            {children}
          </div>
        </div>
      )}
    </Fragment>
    </div>

  )
}

export default Avatar
