/** Fixed, slow-moving monochrome gradient behind the landing page. Styles in globals.css. */
const Aurora = () => (
  <div className="aurora" aria-hidden="true">
    <div className="aurora__blob aurora__blob--1" />
    <div className="aurora__blob aurora__blob--2" />
    <div className="aurora__blob aurora__blob--3" />
    <div className="aurora__blob aurora__blob--4" />
  </div>
);

export default Aurora;
