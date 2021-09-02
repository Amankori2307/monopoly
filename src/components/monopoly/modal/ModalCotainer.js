import style from '../../../assets/css/modal.module.css'

const ModalContainer = ({component: Component, setShow, ...rest}) => {
    const hideOnClick = e => {    
        setShow(false)
    }
    const preventModalCloseOnClick = (e) => {
        if(e && e.stopPropagation) e.stopPropagation(); 
    } 
    return (
        <div className={style.modalContainer} onClick={hideOnClick}>
            <div className={style.cardModal} onClick={preventModalCloseOnClick}>
                <div className={style.closeStrip} >
                    <i className={`fas fa-times ${style.close}`} onClick={hideOnClick}></i>
                </div>
                <div className={style.cardContent}>

                    <Component hideOnClick={hideOnClick} onClick={preventModalCloseOnClick}/>
                </div>
            </div>
        </div>
    );
}

export default ModalContainer