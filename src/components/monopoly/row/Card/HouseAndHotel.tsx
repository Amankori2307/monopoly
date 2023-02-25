import style from '../../../../assets/css/hotel-and-house.module.scss'
import houseIcon from '../../../../assets/images/house-icon.svg'
import hotelIcon from '../../../../assets/images/hotel-icon.svg'
const HouseAndHotel = ({ built, oddRowNum }) => {

    return (
        <div className={`${style.houseAndHotelContainer} `}>
            {built !== 5 ?
                <div className={`${style.houseAndHotel} ${style["house" + built]}`}>
                    {Array.from(Array(built).keys()).map((index) => <div key={index} className={`${style.house}`}>
                        <img src={houseIcon} alt={"house-icon"} className={oddRowNum ? style.rotate : ""} />
                    </div>)}
                </div>
                : <img src={hotelIcon} className={oddRowNum ? style.rotate : ""} alt="hotel-icon" />
            }
        </div>
    );
}

export default HouseAndHotel