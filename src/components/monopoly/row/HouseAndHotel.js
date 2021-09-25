import style from '../../../assets/css/hotel-and-house.module.css'
import houseIcon from '../../../assets/images/house-icon.svg'
import hotelIcon from '../../../assets/images/hotel-icon.svg'
const HouseAndHotel = ({built}) => {
    return (
         <div className={`${style.houseAndHotelContainer} `}>
             { built!==5?
             <div className={`${style.houseAndHotel} ${style["house"+built]}`}>
                {Array(built).fill(1).map((index) => <div key={index} className={style.house}>
                    <img src={houseIcon} alt={"house-icon"} />
                </div>)}
             </div>
             :<img src={hotelIcon} className={style.hotelIcon} alt="hotel-icon"/>
            }
        </div>
    );
}

export default HouseAndHotel