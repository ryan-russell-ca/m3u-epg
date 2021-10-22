import { List } from 'react-movable';
import { ChannelInfoModel, ChannelOrderModel } from '@/types/m3u';
import { ChannelCard } from '@/components/Card';
import styles from './SortableChannels.module.scss';

const ClickableChannels = ({
  channels,
  onSort,
  onRemove,
}: {
  channels: ChannelOrderModel[];
  onSort: ({
    oldIndex,
    newIndex,
  }: {
    oldIndex: number;
    newIndex: number;
  }) => void;
  onRemove?: (channel: ChannelInfoModel) => void;
}) => {
  return (
    <List
      values={channels}
      onChange={onSort}
      lockVertically={true}
      renderList={({ children, props }) => (
        <div className={styles['sortable-channels-container']} {...props}>
          {children}
        </div>
      )}
      renderItem={({ value: { details, order }, props }) => (
        <div
          key={details.url}
          className={styles['sortable-channels-item']}
          {...props}
        >
          <span className={styles['sortable-channels-item-order']}>
            {order || props.key}
          </span>
          <ChannelCard onRemove={onRemove} channel={details} />
        </div>
      )}
    />
  );
};

export default ClickableChannels;
