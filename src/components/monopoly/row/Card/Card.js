// import {} from '../../.'

// const Card = () => {
//     const genCard = () => {
//         let UI = null;
//         switch(data.type){
//             case SITE:
//             case REALM_RAILS:
//             case UTILITY:
//                 UI = (
//                     <div className={genClassList()} onClick={onCardClick}>
//                         <div className={`${style.strip} ${data.color}`}>
//                             <HouseAndHotel built={data.built?data.built:0} odd={rowNum%2!==0}/>
//                         </div>
//                         <div className={style.details}>
//                             <p className={style.sellingPrice}>${data.sellingPrice}</p>
//                             <p className={style.name}>{data.name}</p>
//                         </div>
//                         {data.isMortgaged && <img className={style.mortgaged} src={mortgagedIcon} alt="mortgaged"/>}
//                     </div>
//                 );
//                 break;
//             case SPECIAL:
//                 UI = (
//                     <div className={genClassList()} style={{backgroundImage: `url(${SpecialCardBG[rowNum]})`}}>
//                     </div>
//                 );
//                 break;
//             case CHEST:
//             case CHANCE:
//                 UI = (
//                     <div className={genClassList()}>
                        
//                         <p>{data.name}</p>
//                     </div>
//                 );
//                 break;
//             case TAX:
//                 UI = (
//                     <div className={`${style.card} ${genClassList()}`} onClick={onCardClick}>
//                         <div className={style.details}>
//                             <p className={style.debit}>Pay ${data.debit}</p>
//                             <p className={style.name}>{data.name}</p>
//                         </div>
//                     </div>
//                 );
//                 break;
//             default:
//                 UI = null
//                 break;
//         }
//         return UI        
//     }

//     return genCard()
// }

// export default Card