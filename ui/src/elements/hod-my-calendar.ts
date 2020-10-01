import { ApolloClient } from '@apollo/client/core';
import { html, css, LitElement, property, query } from 'lit-element';

import { Calendar } from '@fullcalendar/core';
import interactionPlugin from '@fullcalendar/interaction';
// @ts-ignore
import commonStyles from '@fullcalendar/common/main.css';
import dayGridPlugin from '@fullcalendar/daygrid';
// @ts-ignore
import daygridStyles from '@fullcalendar/daygrid/main.css';
import timeGridPlugin from '@fullcalendar/timegrid';
// @ts-ignore
import timeGridStyles from '@fullcalendar/timegrid/main.css';
// @ts-ignore
import bootstrapStyles from 'bootstrap/dist/css/bootstrap.css';
// @ts-ignore
import iconStyles from '@fortawesome/fontawesome-free/css/all.css'; // needs additional webpack config!
import '@material/mwc-linear-progress';
import '@material/mwc-menu/mwc-menu-surface';
import type { MenuSurface } from '@material/mwc-menu/mwc-menu-surface';

import { CalendarEvent } from '../types';
import { GET_MY_CALENDAR_EVENTS } from '../graphql/queries';
import { dateToSecsTimestamp, eventToFullCalendar } from '../utils';

export abstract class HodMyCalendar extends LitElement {
  static get styles() {
    return [
      commonStyles,
      daygridStyles,
      timeGridStyles,
      bootstrapStyles,
      iconStyles,
      css`
        :host {
          font-family: 'Roboto', sans-serif;
        }
      `,
    ];
  }
  /** Public attributes */

  /**
   * Initial calendar view (for reference visit https://fullcalendar.io/docs/plugin-index)
   * @type {'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'}
   * @attr initial-view
   */
  @property({ type: String, attribute: 'initial-view' })
  initialView: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' = 'timeGridWeek';

  /** Dependencies */
  abstract get _apolloClient(): ApolloClient<any>;

  /** Private properties */

  @property({ type: Boolean, attribute: false }) _loading = false;
  @property({ type: Array, attribute: false }) _myCalendarEvents:
    | Array<CalendarEvent>
    | undefined = undefined;

  @query('#calendar')
  _calendarEl!: HTMLElement;

  @query('#create-event-menu')
  _createEventMenu!: MenuSurface;

  @query('#create-calendar-event')
  _createEvent!: any;

  _calendar!: Calendar;

  async loadCalendarEvents() {
    this._loading = true;
    const result = await this._apolloClient.query({
      query: GET_MY_CALENDAR_EVENTS,
      fetchPolicy: 'network-only',
    });

    this._myCalendarEvents = result.data.myCalendarEvents;
    if (this._myCalendarEvents) {
      const fullCalendarEvents = this._myCalendarEvents.map(
        eventToFullCalendar
      );
      this._calendar.removeAllEventSources();
      this._calendar.addEventSource(fullCalendarEvents);
      this._calendar.render();
    }
    this._loading = false;
  }

  setupCalendar() {
    this._calendar = new Calendar(this._calendarEl, {
      plugins: [interactionPlugin, dayGridPlugin, timeGridPlugin],
      initialView: this.initialView,
      themeSystem: 'bootstrap',
      selectable: true,
      selectMirror: true,
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay',
      },
      select: info => {
        this._createEventMenu.open = true;
        this._createEventMenu.anchor = (info.jsEvent as any)
          .path[0] as HTMLElement;
        this._createEvent.initialEventProperties = {
          startTime: dateToSecsTimestamp(info.start),
          endTime: dateToSecsTimestamp(info.end),
        };
      },
    });

    this._calendar.render();
  }

  async firstUpdated() {
    this.setupCalendar();

    await this.loadCalendarEvents();
  }

  renderCreateEventCard() {
    return html` <mwc-menu-surface
      id="create-event-menu"
      absolute
      corner="TOP_END"
    >
      <div style="padding: 16px;">
        <hod-create-calendar-event
          id="create-calendar-event"
          @event-created=${() => {
            this._createEventMenu.open = false;
            this.loadCalendarEvents();
          }}
        ></hod-create-calendar-event>
      </div>
    </mwc-menu-surface>`;
  }

  render() {
    return html`
      <div style="position: relative;">
        ${this.renderCreateEventCard()}
        ${this._loading
          ? html`<mwc-linear-progress indeterminate></mwc-linear-progress>`
          : html``}

        <div id="calendar"></div>
      </div>
    `;
  }
}
export function defineHodMyCalendar(apolloClient: ApolloClient<any>): void {
  customElements.define(
    'hod-my-calendar',
    class extends HodMyCalendar {
      get _apolloClient() {
        return apolloClient;
      }
    }
  );
}
