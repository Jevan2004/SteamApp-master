"use client"
import { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { userStats } from '../games.js'; 

export default function GameCharts({ games, priceCategories }) {
  const priceChartRef = useRef(null);
  const genreChartRef = useRef(null);
  const completionChartRef = useRef(null);
  
  useEffect(() => {
    Chart.register(...registerables);
  }, []);

  useEffect(() => {
    if (!games.length) return;
    
    const ctx = priceChartRef.current.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Cheap', 'Average', 'Expensive'],
        datasets: [{
          data: [
            priceCategories.cheap.length,
            priceCategories.average.length,
            priceCategories.expensive.length
          ],
          backgroundColor: [
            '#4CAF50',
            '#FFC107',
            '#F44336'
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Price Distribution'
          }
        }
      }
    });

    return () => chart.destroy();
  }, [games, priceCategories]);

  useEffect(() => {
    if (!games.length) return;
    
    const genreCounts = {};
    games.forEach(game => {
      game.tags?.forEach(tag => {
        genreCounts[tag] = (genreCounts[tag] || 0) + 1;
      });
    });

    const ctx = genreChartRef.current.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(genreCounts),
        datasets: [{
          label: 'Games per Genre',
          data: Object.values(genreCounts),
          backgroundColor: '#2196F3'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Genre Distribution'
          }
        }
      }
    });

    return () => chart.destroy();
  }, [games]);

  useEffect(() => {
    if (!games.length) return;
    
    let completed = 0;
    let inProgress = 0;
    let notStarted = 0;

    games.forEach(game => {
      const stats = userStats[game.id];
      if (stats?.finished) {
        completed++;
      } else if (stats?.hoursPlayed > 0) {
        inProgress++;
      } else {
        notStarted++;
      }
    });

    const ctx = completionChartRef.current.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Completed', 'In Progress', 'Not Started'],
        datasets: [{
          data: [completed, inProgress, notStarted],
          backgroundColor: [
            '#9C27B0',
            '#3F51B5',
            '#607D8B'
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Completion Status'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });

    return () => chart.destroy();
  }, [games]);

  return (
    <div className="charts-container">
      <div className="chart-wrapper">
        <canvas ref={priceChartRef}></canvas>
      </div>
      <div className="chart-wrapper">
        <canvas ref={genreChartRef}></canvas>
      </div>
      <div className="chart-wrapper">
        <canvas ref={completionChartRef}></canvas>
      </div>
    </div>
  );
}