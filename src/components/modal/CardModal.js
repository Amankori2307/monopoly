import style from '../../assets/css/modal.module.css'

const CardModal = ({onClick}) => {
    return (
        <div className={style.cardModal} onClick={onClick}>
            <div className={style.card}>
                <p className={style.name}>{}</p>                
            </div>
        </div>
    ); 
}
export default CardModal