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
            <Component hideOnClick={hideOnClick} onClick={preventModalCloseOnClick}/>
        </div>
    );
}

export default ModalContainer