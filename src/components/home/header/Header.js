import style from '../../../assets/css/home/header.module.css'
import logo from '../../../assets/images/logo.svg'
const Header = () => {
    return (
        <header className={`${style.header} parentContainer`}>
            <div className={'container'}>
                <div className={style.logo}>
                    <img src={logo} alt={logo}/>
                </div>

            </div>
            
        </header>
    );
}

export default Header