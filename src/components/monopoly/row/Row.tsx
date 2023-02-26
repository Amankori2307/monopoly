import { ISite } from 'lib/core/src/lib';
import { useSelector } from 'react-redux';
import { IState } from '../../../../src/redux/reducers/rootReducer';
import style from '../../../assets/css/row.module.scss';
import CardWrapper from './CardWrapper';

interface RowPropsType {
  rowNum: number;
  sitesInRow: ISite[];
}

const Row = (props: RowPropsType) => {
  const { rowNum, sitesInRow } = props;
  const boughtBy = useSelector((store: IState) => store.siteData.boughtBy);
  return (
    <div className={`${style.row} ${style['row' + rowNum]}`}>
      {sitesInRow.map((site, index) => (
        <CardWrapper
          key={index}
          site={site}
          rowNum={rowNum}
          boughtBy={boughtBy[site.id]}
        />
      ))}
    </div>
  );
};

export default Row;
