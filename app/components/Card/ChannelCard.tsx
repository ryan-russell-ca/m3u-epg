import Image from 'next/image';
import styles from './ChannelCard.module.scss';

const Card = ({ logo, name, originalName, tvgId }) => (
  <div className={styles['card']}>
    <div className={styles['card-header']}>
      {logo && logo !== 'null' ? (
        <Image src={logo} alt={tvgId} layout="fill" objectFit="contain" />
      ) : null}
    </div>
    <div className={styles['card-body']}>
      <span className={styles['tag tag-teal']}>{name}</span>
      <span className={styles['tag tag-teal']}>{originalName}</span>
      <span className={styles['tag tag-teal']}>{tvgId}</span>
    </div>
  </div>
);

export default Card;
