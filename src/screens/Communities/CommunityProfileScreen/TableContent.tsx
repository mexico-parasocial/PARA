import {Platform, useWindowDimensions} from 'react-native'
import {type StyleProp, type ViewStyle} from 'react-native'
import {type AnimatedStyleProp} from 'react-native-reanimated'
import {StickyTable} from 'react-native-sticky-table'

import {type UsePaletteValue} from '#/lib/hooks/usePalette'

export function TableContent({pal}: {pal: UsePaletteValue}) {
  const {width} = useWindowDimensions()
  const isMobile = width < 800 || Platform.OS !== 'web'

  return (
    <StickyTable
      data={{
        titleData: [
          'Policy',
          'RAQ',
          'Global',
          'Socialissues',
          'PublicServices',
          'InternalRevenueService',
          'ExternalAffairs',
          'Economy',
          'InternalAffairs',
        ],
        tableData: [
          {
            maxWidth: isMobile ? 70 : 100, // Responsive width
            data: [
              isMobile ? 'NV' : 'No. of votes',
              '9',
              '26',
              '2',
              '9',
              '6',
              '1',
              '5',
              '8',
            ],
          },
          {
            maxWidth: 70,
            data: [
              isMobile ? 'MV' : 'Abs. Average',
              '3.0',
              '2.8',
              '3.0',
              '3.0',
              '2.8',
              '2.8',
              '2.8',
              '2.8',
            ],
          },
          {
            maxWidth: isMobile ? 70 : 100, // Responsive width
            data: [
              isMobile ? 'Avg(+)' : '  (+) Average',
              '1.5',
              '1.4',
              '1.8',
              '1.9',
              '1.2',
              '1.1',
              '1.3',
              '1.4',
            ],
          },
          {
            maxWidth: isMobile ? 70 : 100, // Responsive width
            data: [
              isMobile ? 'Avg(-)' : '  (-) Average',
              '-1.5',
              '-1.4',
              '-1.2',
              '-1.1',
              '-1.6',
              '-1.7',
              '-1.5',
              '-1.4',
            ],
          },
        ],
      }}
      maxWidth={140} // Width for Policy column
      minWidth={140}
      rowTitleProps={{
        titleBackgroundColor: pal.view.backgroundColor as string,
        firstIndexContainerStyle: [
          pal.view,
          pal.border,
          {
            borderRightWidth: 0,
            borderBottomWidth: 0,
            paddingHorizontal: 8,
            justifyContent: 'center',
          },
        ] as unknown as AnimatedStyleProp<ViewStyle>,
        otherIndexContainerStyle: [
          pal.view,
          pal.border,
          {
            borderRightWidth: 0,
            borderBottomWidth: 0,
            paddingHorizontal: 8,
            justifyContent: 'center',
          },
        ] as unknown as AnimatedStyleProp<ViewStyle>,
        separatorViewStyle: [
          pal.view,
          pal.border,
          {borderRightWidth: 0, width: 0},
        ],
        firstWordTextProps: {
          style: [pal.text, {fontWeight: 'bold', textAlign: 'center'}],
        },
        restSentenceTextProps: {
          style: [pal.text, {textAlign: 'center'}],
        },
      }}
      tableItemProps={{
        listItemContainerStyle: pal.view,
        columnTitleStyle: [
          pal.view,
          pal.border,
          {
            borderRightWidth: 0,
            borderBottomWidth: 0,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ] as StyleProp<ViewStyle>,
        columnItemStyle: [
          pal.view,
          pal.border,
          {
            borderRightWidth: 0,
            borderBottomWidth: 0,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ] as StyleProp<ViewStyle>,
        separatorViewStyle: [pal.view, {width: 0}],
        columnItemTextStyle: [pal.text, {textAlign: 'center'}],
      }}
    />
  )
}
