/**
 * Hardcoded Menu Data
 * This will be replaced by real API calls in the future
 */

import type { MenuResponse } from '@/types/api/menu';

export const HARDCODED_MENU_DATA: MenuResponse = {
  data: [
    {
      id: '886Wmds3KhbuDmhHkjxK',
      businessId: 'vQX9lFoJTwpYBhF5v4aZ',
      name: 'Christmas Special',
      description: 'christmas pro',
      type: 'mixed',
      availability: {
        startTime: '10:00',
        endTime: '12:00',
        days: ['sunday', 'saturday'],
      },
      status: 'active',
      createdAt: {
        _seconds: 1759700644,
        _nanoseconds: 788000000,
      },
      tags: [],
      itemIds: [
        'IswAs9mWtL6i97PIlaGt',
        'cWPT8QwFt5ovyEpJ7yGo',
        'I9AfVT5TGmcJBy6MXxob',
      ],
      updatedAt: {
        _seconds: 1760022667,
        _nanoseconds: 679000000,
      },
      order: 1,
    },
    {
      id: 'tJGL9psEVvbEiChvmxgl',
      businessId: 'vQX9lFoJTwpYBhF5v4aZ',
      name: 'Mediterranean',
      description: 'humus pita ',
      type: 'food',
      availability: {
        startTime: '12:00',
        endTime: '22:00',
        days: ['wednesday', 'thursday'],
      },
      status: 'active',
      createdAt: {
        _seconds: 1759701061,
        _nanoseconds: 883000000,
      },
      tags: [],
      itemIds: [
        'cWPT8QwFt5ovyEpJ7yGo',
        'Hjl7s21cxdfsOiV2OCUf',
        'IswAs9mWtL6i97PIlaGt',
      ],
      updatedAt: {
        _seconds: 1759701822,
        _nanoseconds: 266000000,
      },
      order: 2,
    },
    {
      id: 'u5AHD2np3hfuaWcCThVO',
      businessId: 'vQX9lFoJTwpYBhF5v4aZ',
      status: 'active',
      createdAt: {
        _seconds: 1759691052,
        _nanoseconds: 976000000,
      },
      description: 'This is the summer menu 1',
      availability: {
        startTime: 'May',
        endTime: 'June',
        days: 'all',
      },
      type: 'food',
      name: 'Summer Menu',
      tags: [],
      itemIds: [
        'Hjl7s21cxdfsOiV2OCUf',
        'IswAs9mWtL6i97PIlaGt',
        'I9AfVT5TGmcJBy6MXxob',
        'bMGyDHNZyEjUGUADd6vR',
      ],
      updatedAt: {
        _seconds: 1760262194,
        _nanoseconds: 418000000,
      },
      order: 3,
    },
  ],
};
