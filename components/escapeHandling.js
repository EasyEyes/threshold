// TODO Skip block is unreliable now, refactor ESC handling!

export const initializeEscHandlingDiv = () => {
  // TODO This could be improved by a lot
  // Fixed for old code by @sagarrpandav
  if (document.getElementById("esc-key-handling-div").children.length == 0) {
    // Add only if not present
    document.getElementById("esc-key-handling-div").innerHTML = `<div
  class="modal fade"
  id="exampleModal"
  tabindex="-1"
  aria-labelledby="exampleModalLabel"
  aria-hidden="true"
>
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title" id="modalTitle">Escape Key was Pressed</h3>
      </div>
      <div
        class="modal-body"
        id="modalBody"
        style="display: flex; justify-content: space-around"
      >
        <div style="display: grid">
          <button
            type="button"
            id="skip-trial-btn"
            class="btn btn-outline-secondary"
            style="font-size: x-large"
            data-bs-dismiss="modal"
          >
            Skip Trial
          </button>
          <span style="text-align: center">(Space)</span>
        </div>
        <div id="skip-block-div" style="display: grid">
          <button
            type="button"
            id="skip-block-btn"
            class="btn btn-outline-secondary"
            style="font-size: x-large"
            data-bs-dismiss="modal"
          >
            Skip Block
          </button>
          <span style="text-align: center">(Enter)</span>
        </div>
        <div style="display: grid">
          <button
            type="button"
            id="quit-btn"
            class="btn btn-outline-danger"
            style="font-size: x-large"
            data-bs-dismiss="modal"
          >
            Quit
          </button>
          <span style="text-align: center">(Escape)</span>
        </div>
      </div>
    </div>
  </div>
</div>`;
  }
};
