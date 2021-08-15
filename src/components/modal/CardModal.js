import style from '../../assets/css/modal.module.css'
const CardModal = ({onClick}) => {


    return (
        <div className={style.cardModal} onClick={onClick}>
            <div className={style.card}>
                
            </div>
        </div>
    ); 
}
export default CardModal