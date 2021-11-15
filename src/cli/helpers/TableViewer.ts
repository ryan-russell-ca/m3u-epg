import { table } from 'table';

const TableViewer = (data: Record<string, any>[], columns?: string[]) => {
  if (!data.length) {
    return 'No data to diplay';
  }

  if (columns) {
    return table([columns, ...data.map((d) => columns.map((c) => d[c]))]);
  }

  return table([Object.keys(data[0]), ...data.map((d) => Object.values(d))]);
};

export default TableViewer;
