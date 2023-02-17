import style from '../../../assets/css/home/header.module.scss'
import logo from '../../../assets/images/logo.svg'
const Header = () => {
    return (
        <header className={`${style.header} parentContainer`}>
            <div className={'container'}>
                <div className={style.logo}>
                    <a href="/"><img src={logo} alt={logo} /></a>
                </div>

            </div>

        </header>
    );
}

export default Header