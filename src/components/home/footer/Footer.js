import style from '../../../assets/css/home/footer.module.scss'
const Footer = () => {
    return (
        <div className={`${style.footerContainer} parentContainer`}>
            <div className={`${style.footer} container`}>
                <p className={style.copyright}>Monopoly &copy; 2021</p>
            </div>
        </div>
    );
}

export default Footer