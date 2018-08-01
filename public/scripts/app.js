$(document).ready(function() {

  // Toggle Class for completed task
  $('.button-complete').click(function(ev) {
    $(this).parents('#task').addClass('completed')
    console.log('Completed class has been added')
  })

  // Toggle Class for important Task
  $('.button-important').click(function(ev) {
    $(this).parents('#task').addClass('important')
    console.log('Important Class has been added')
  })

  $('.searchBar').submit(ev => {
    ev.preventDefault()
    let search = $('.taskbar-form_input').val()
    console.log('search', search)
    $.post('/tasks', {search}, function(res) {
      window.location.reload();
    });
  })
})
