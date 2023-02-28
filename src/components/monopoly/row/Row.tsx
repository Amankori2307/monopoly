import { ISite } from 'lib/core/src/lib';
import useAppSelector from 'src/hooks/redux/use-app-selector';
import style from '../../../assets/css/row.module.scss';
import CardWrapper from './CardWrapper';

interface RowPropsType {
  rowNum: number;
  sitesInRow: ISite[];
}

const Row = (props: RowPropsType) => {
  const { rowNum, sitesInRow } = props;
  const boughtBy = useAppSelector((store) => store.siteData.boughtBy);
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
