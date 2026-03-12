import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  MoreVertical 
} from 'lucide-react';
import './Calendar.css';

// Event interface matching UI data
interface CalendarEvent {
  id: string;
  date: Date; // Keep track of the real date
  time: string;
  title: string;
  desc: string;
  color: 'cyan' | 'purple' | 'blue';
}

const DUMMY_EVENTS: CalendarEvent[] = [
  { id: '1', date: new Date(2023, 9, 12), time: '09:00 AM', title: 'Morning Announce...', desc: 'Daily kick-off update...', color: 'cyan' },
  { id: '2', date: new Date(2023, 9, 12), time: '14:30 PM', title: 'Marketing Campaign', desc: 'Official kickoff for Q4...', color: 'purple' },
  { id: '3', date: new Date(2023, 9, 12), time: '18:00 PM', title: 'Evening Recap', desc: 'Wrapping up the day...', color: 'cyan' },
  { id: '4', date: new Date(2023, 9, 12), time: '21:00 PM', title: 'System Maintenan...', desc: 'Auto-scheduled check...', color: 'blue' },
  { id: '5', date: new Date(2023, 9, 16), time: '10:15 AM', title: 'Team Meeting Recap', desc: 'Key takeaways...', color: 'purple' },
  { id: '6', date: new Date(2023, 9, 20), time: '11:00 AM', title: 'Weekly Update', desc: 'Community check...', color: 'cyan' },
  { id: '7', date: new Date(2023, 9, 20), time: '16:00 PM', title: 'Bug Fix Log', desc: 'Current resolutions...', color: 'purple' },
];

export default function Calendar() {
  const navigate = useNavigate();
  // Using October 2023 as default to match the mock image exactly, but logic supports any date
  const [currentDate, setCurrentDate] = useState(new Date(2023, 9, 1)); // Oct 1, 2023
  
  const daysOfWeek = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };
  
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Build calendar grid
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  
  // Get first day of month (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  // Adjust to make Monday the first day (0 = Mon, 6 = Sun)
  const startingDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  
  const days = [];
  
  // Previous month days
  const prevMonthDays = getDaysInMonth(year, month - 1);
  for (let i = 0; i < startingDay; i++) {
    days.push({
      date: new Date(year, month - 1, prevMonthDays - startingDay + i + 1),
      isCurrentMonth: false
    });
  }
  
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      date: new Date(year, month, i),
      isCurrentMonth: true
    });
  }
  
  // Next month days to complete grid (42 cells total for 6 rows)
  const totalCells = 42;
  const remainingCells = totalCells - days.length;
  for (let i = 1; i <= remainingCells; i++) {
    days.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false
    });
  }

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="calendar-page">
      <div className="calendar__header-info">
        <div className="calendar__breadcrumbs">
          <span>DASHBOARD</span>
          <span>›</span>
          <span>CONTENT CALENDAR</span>
        </div>
        <h1 className="calendar__title">Content Calendar</h1>
        <p className="calendar__subtitle">
          View and manage your <span className="text-cyan">upcoming scheduled content</span>.
        </p>
      </div>

      <div className="calendar__controls">
        <div className="calendar__tabs">
          <button className="calendar__tab calendar__tab--active">Calendar View</button>
          <button className="calendar__tab">List View</button>
        </div>

        <div className="calendar__nav">
          <div className="calendar__month-selector">
            <button className="calendar__month-btn" onClick={prevMonth}><ChevronLeft size={20} /></button>
            <span>{monthNames[month]} {year}</span>
            <button className="calendar__month-btn" onClick={nextMonth}><ChevronRight size={20} /></button>
          </div>
          
          <button className="btn-cyan-create" onClick={() => navigate('/publish')}>
            <Plus size={16} /> Create New Post
          </button>
        </div>
      </div>

      <div className="calendar__grid">
        <div className="calendar__days-header">
          {daysOfWeek.map(day => (
            <div key={day} className="calendar__day-name">{day}</div>
          ))}
        </div>
        
        <div className="calendar__days-grid">
          {days.map((dayObj, index) => {
            const monthShort = monthNames[dayObj.date.getMonth()].substring(0, 3);
            const labelStr = `${monthShort} ${dayObj.date.getDate()}`;
            
            // Get events for this specific day
            const dayEvents = DUMMY_EVENTS.filter(e => 
              e.date.getFullYear() === dayObj.date.getFullYear() && 
              e.date.getMonth() === dayObj.date.getMonth() && 
              e.date.getDate() === dayObj.date.getDate()
            );

            return (
              <div 
                key={index} 
                className={`calendar__day-cell ${!dayObj.isCurrentMonth ? 'calendar__day-cell--other-month' : ''}`}
              >
                <div className="day-cell__header">
                  <span className="day-cell__date">{labelStr}</span>
                  {dayObj.isCurrentMonth && <Plus size={14} className="day-cell__add" />}
                </div>
                
                <div className="calendar__events">
                  {dayEvents.map(evt => (
                    <div key={evt.id} className={`calendar__event calendar__event--${evt.color}`}>
                      <div className="event__header">
                        <span className="event__time">{evt.time}</span>
                        <MoreVertical size={12} className="event__more" />
                      </div>
                      <div className="event__title">{evt.title}</div>
                      <div className="event__desc">{evt.desc}</div>
                    </div>
                  ))}
                  
                  <div className="day-cell__schedule-placeholder" onClick={() => navigate('/publish')}>
                    <Plus size={20} />
                    <span>SCHEDULE</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
